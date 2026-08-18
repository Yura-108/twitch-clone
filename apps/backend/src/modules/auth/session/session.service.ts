import {
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
import type { StoredSession } from '@/src/shared/types/session.types';
import { getSessionMetadata } from '@/src/shared/utils/session-metadata.util';
import { destroySession, saveSession } from '@/src/shared/utils/session.util';

@Injectable()
export class SessionService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly redisService: RedisService
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
	): Promise<User> {
		const { login, password } = input;

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

		const metadata = getSessionMetadata(req, userAgent);

		return saveSession(req, user, metadata);
	}

	public async logout(req: Request): Promise<boolean> {
		return destroySession(req, this.configService);
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
