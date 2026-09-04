import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { graphqlUploadExpress } from 'graphql-upload-ts';

import { getSessionMiddleware } from '@/src/core/config/session.config';
import { RedisService } from '@/src/core/redis/redis.service';

import { CoreModule } from './core/core.module';

expand(config({ path: '../../.env' }));

async function bootstrap() {
	const app = await NestFactory.create(CoreModule, { rawBody: true });

	const config = app.get(ConfigService);
	const redis = app.get(RedisService);

	app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')));
	app.use(
		config.getOrThrow<string>('GRAPHQL_PREFIX'),
		graphqlUploadExpress({ maxFileSize: 10 * 1024 * 1024, maxFiles: 1 })
	);

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true
		})
	);

	app.use(getSessionMiddleware(config, redis));

	app.enableCors({
		origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
		credentials: true,
		exposedHeaders: ['set-cookie']
	});

	await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}

bootstrap();
