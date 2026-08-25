import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import session from 'express-session';
import { graphqlUploadExpress } from 'graphql-upload-ts';

import { getSessionCookieOptions } from '@/src/core/config/session.config';
import { RedisService } from '@/src/core/redis/redis.service';

import { CoreModule } from './core/core.module';

// Scripts run with cwd = apps/backend (yarn workspaces), so the single
// source-of-truth .env at the monorepo root is two levels up.
expand(config({ path: '../../.env' }));

async function bootstrap() {
	const app = await NestFactory.create(CoreModule, { rawBody: true });

	const config = app.get(ConfigService);
	const redis = app.get(RedisService);

	app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')));
	app.use(
		config.getOrThrow<string>('GRAPHQL_PREFIX'),
		// The same 10 MB the profile service enforces, but applied while the
		// multipart body is still being parsed — the request is cut off before
		// anything reaches a resolver.
		graphqlUploadExpress({ maxFileSize: 10 * 1024 * 1024, maxFiles: 1 })
	);

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true
		})
	);

	app.use(
		session({
			secret: config.getOrThrow<string>('SESSION_SECRET'),
			name: config.getOrThrow<string>('SESSION_NAME'),
			resave: false,
			saveUninitialized: false,
			cookie: getSessionCookieOptions(config),
			store: new RedisStore({
				client: redis,
				prefix: config.getOrThrow<string>('SESSION_FOLDER')
			})
		})
	);

	app.enableCors({
		origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
		credentials: true,
		exposedHeaders: ['set-cookie']
	});

	await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}

bootstrap();
