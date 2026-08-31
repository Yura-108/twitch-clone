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

import { getEncryptionKey } from '@/src/core/config/encryption.config';
import { PrismaService } from '@/src/core/prisma/prisma.service';
import { RedisService } from '@/src/core/redis/redis.service';
import { AuthModel } from '@/src/modules/auth/account/models/auth.model';
import { LoginInput } from '@/src/modules/auth/session/inputs/login.input';
import { SessionModel } from '@/src/modules/auth/session/models/session.model';
import { RecoveryCodeService } from '@/src/modules/auth/totp/recovery-code.service';
import { VerificationService } from '@/src/modules/auth/verification/verification.service';
import type { StoredSession } from '@/src/shared/types/session.types';
import { decrypt } from '@/src/shared/utils/encryption.util';
import { getSessionMetadata } from '@/src/shared/utils/session-metadata.util';
import {
	clearSessionCookie,
	destroySession,
	saveSession
} from '@/src/shared/utils/session.util';
import { verifyTotpPin } from '@/src/shared/utils/totp.util';

@Injectable()
export class SessionService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly redisService: RedisService,
		private readonly verificationService: VerificationService,
		private readonly recoveryCodeService: RecoveryCodeService
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

	public async login(req: Request, input: LoginInput, userAgent: string) {
		const { login, password, pin, recoveryCode } = input;

		let user = await this.prismaService.user.findFirst({
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

		// Signing in during the grace period cancels the deactivation. Clearing
		// deactivatedAt matters as much as the flag: the deletion cron selects
		// by that date, so a leftover value would delete a live account.
		if (user.isDeactivated) {
			user = await this.prismaService.user.update({
				where: { id: user.id },
				data: { isDeactivated: false, deactivatedAt: null }
			});
		}

		if (!user.isEmailVerified) {
			await this.verificationService.sendVerificationToken(user);

			throw new BadRequestException(
				'Account is not verified. Please check your email address.'
			);
		}

		if (user.isTotpEnabled && user.totpSecret) {
			if (!pin && !recoveryCode) {
				return {
					message: 'A verification code is required to finish signing in'
				};
			}

			if (pin) {
				const secret = decrypt(
					user.totpSecret,
					getEncryptionKey(this.configService)
				);

				if (!verifyTotpPin(user.email, secret, pin)) {
					throw new BadRequestException('Invalid code');
				}
			} else if (recoveryCode) {
				const consumed = await this.recoveryCodeService.consume(
					user.id,
					recoveryCode
				);

				if (!consumed) {
					throw new BadRequestException('Invalid recovery code');
				}
			}
		}

		const metadata = getSessionMetadata(req, userAgent);

		// Wrapped in { user } because the mutation returns AuthModel, whose two
		// branches are "here is your account" and "send me a TOTP code".
		return { user: await saveSession(req, user, metadata) };
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

	public async removeAllForUser(
		userId: string,
		exceptSessionId?: string
	): Promise<number> {
		const prefix = this.sessionPrefix;
		const keys = await this.redisService.keys(`${prefix}*`);

		let removed = 0;

		for (const key of keys) {
			if (exceptSessionId && key.slice(prefix.length) === exceptSessionId) {
				continue;
			}

			const raw = await this.redisService.get(key);

			if (!raw) {
				continue;
			}

			const session = this.toSessionModel(key, raw);

			if (session?.userId === userId) {
				await this.redisService.del(key);
				removed++;
			}
		}

		return removed;
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
