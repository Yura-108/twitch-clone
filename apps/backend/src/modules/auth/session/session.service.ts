import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/generated/client';
import { verify } from 'argon2';
import type { Request } from 'express';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { RedisService } from '@/src/core/redis/redis.service';
import { LoginInput } from '@/src/modules/auth/session/inputs/login.input';
import { SessionModel } from '@/src/modules/auth/session/models/session.model';
import { VerificationService } from '@/src/modules/auth/verification/verification.service';
import type { StoredSession } from '@/src/shared/types/session.types';
import { getSessionMetadata } from '@/src/shared/utils/session-metadata.util';
import {
	clearSessionCookie,
	destroySession,
	saveSession
} from '@/src/shared/utils/session.util';
import {TOTP} from "otpauth";
import {AuthModel} from "@/src/modules/auth/account/models/auth.model";

@Injectable()
export class SessionService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly redisService: RedisService,
		private readonly verificationService: VerificationService
	) {}

	public async findByUser(req: Request): Promise<SessionModel[]> {
		const userId = req.session.userId;

		if (!userId) {
			throw new NotFoundException('User not found');
		}

		const prefix = this.sessionPrefix;
		const keys = await this.redisService.keys(`${prefix}*`);

		const sessions: SessionModel[] = [];

		for (const key of keys) {
			const raw = await this.redisService.get(key);

			if (!raw) {
				continue;
			}

			const session = this.toSessionModel(key, raw);

			if (session?.userId === userId) {
				sessions.push(session);
			}
		}

		sessions.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

		return sessions.filter(session => session.id !== req.session.id);
	}

	public async findCurrent(req: Request): Promise<SessionModel> {
		const key = `${this.sessionPrefix}${req.session.id}`;

		const raw = await this.redisService.get(key);

		const session = raw && this.toSessionModel(key, raw);

		if (!session) {
			throw new NotFoundException('Session not found');
		}

		return session;
	}

	public async login(
		req: Request,
		input: LoginInput,
		userAgent: string
	){
		const { login, password, pin } = input;

		const user = await this.prismaService.user.findFirst({
			where: {
				OR: [{ username: { equals: login } }, { email: { equals: login } }]
			}
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		const isValidPassword = await verify(user.password, password);

		if (!isValidPassword) {
			throw new UnauthorizedException('Invalid password');
		}

		if (!user.isEmailVerified) {
			await this.verificationService.sendVerificationToken(user);

			throw new BadRequestException(
				'Account is not verified. Please check your email address.'
			);
		}

		if (user.isTotpEnabled && user.totpSecret) {
			if (!pin) {
				return {
					message: 'Необходим код для завершения авторизации'
				}
			}

			const totp = new TOTP({
				issuer: 'Twitch',
				label: `${user.email}`,
				algorithm: 'SHA1',
				digits: 6,
				secret: user.totpSecret
			});

			const delta = totp.validate({ token: pin })

			if (delta === null) {
				throw new BadRequestException('Неверный код')
			}
		}

		const metadata = getSessionMetadata(req, userAgent);

		return saveSession(req, user, metadata);
	}

	public async logout(req: Request): Promise<boolean> {
		return destroySession(req, this.configService);
	}

	public async clearSession(req: Request): Promise<boolean> {
		clearSessionCookie(req, this.configService);

		return true;
	}

	public async removeSession(req: Request, id: string): Promise<boolean> {
		if (req.session.id === id) {
			throw new ConflictException('The current session cannot be deleted');
		}

		const key = this.sessionPrefix + id;

		const raw = await this.redisService.get(key);
		const session = raw && this.toSessionModel(key, raw);

		if (!session || session.userId !== req.session.userId) {
			throw new NotFoundException('Session not found');
		}

		await this.redisService.del(key);

		return true;
	}

	private get sessionPrefix(): string {
		return this.configService.getOrThrow<string>('SESSION_FOLDER');
	}

	private toSessionModel(key: string, raw: string): SessionModel | null {
		const session = JSON.parse(raw) as StoredSession;

		if (!session.userId || !session.createdAt || !session.metadata) {
			return null;
		}

		return {
			id: key.slice(this.sessionPrefix.length),
			userId: session.userId,
			createdAt: session.createdAt,
			metadata: session.metadata
		};
	}
}
