import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/generated/client';
import type { Request } from 'express';

import { getSessionCookieOptions } from '@/src/core/config/session.config';
import type { SessionMetadata } from '@/src/shared/types/session-metadata.types';

export function saveSession(
	req: Request,
	user: User,
	metadata: SessionMetadata
) {
	return new Promise<User>((resolve, reject) => {
		req.session.createdAt = new Date().toISOString();
		req.session.userId = user.id;
		req.session.metadata = metadata;

		req.session.save(err => {
			if (err) {
				return reject(new InternalServerErrorException('No saved session'));
			}

			resolve(user);
		});
	});
}

export function destroySession(req: Request, configService: ConfigService) {
	return new Promise<boolean>((resolve, reject) => {
		req.session.destroy(err => {
			if (err) {
				return reject(new InternalServerErrorException("Couldn't end session"));
			}

			clearSessionCookie(req, configService);

			resolve(true);
		});
	});
}

export function clearSessionCookie(req: Request, configService: ConfigService) {
	const { maxAge, ...options } = getSessionCookieOptions(configService);

	req.res?.clearCookie(
		configService.getOrThrow<string>('SESSION_NAME'),
		options
	);
}
