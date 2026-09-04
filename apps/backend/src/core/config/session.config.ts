import { ConfigService } from '@nestjs/config';
import { RedisStore } from 'connect-redis';
import type { CookieOptions, RequestHandler } from 'express';
import session from 'express-session';

import { RedisService } from '@/src/core/redis/redis.service';
import { ms, type StringValue } from '@/src/shared/utils/ms.util';
import { parseBoolean } from '@/src/shared/utils/parse-boolean.util';

// A cookie's identity is name + domain + path, and clients only honour a
// clearing header whose attributes match the ones the cookie was set with.
// So the options that create the session cookie in main.ts and the options
// that clear it in clearSessionCookie() have to come from one place.
export function getSessionCookieOptions(
	configService: ConfigService
): CookieOptions {
	return {
		domain: configService.getOrThrow<string>('SESSION_DOMAIN'),
		maxAge: ms(configService.getOrThrow<StringValue>('SESSION_MAX_AGE')),
		httpOnly: parseBoolean(
			configService.getOrThrow<string>('SESSION_HTTP_ONLY')
		),
		secure: parseBoolean(configService.getOrThrow<string>('SESSION_SECURE')),
		sameSite: 'lax'
	};
}

// The HTTP pipeline and the websocket upgrade handshake both have to resolve
// the same session, so the middleware is built once here and reused by main.ts
// and by the graphql-ws onConnect hook.
export function getSessionMiddleware(
	configService: ConfigService,
	redisService: RedisService
): RequestHandler {
	return session({
		secret: configService.getOrThrow<string>('SESSION_SECRET'),
		name: configService.getOrThrow<string>('SESSION_NAME'),
		resave: false,
		saveUninitialized: false,
		cookie: getSessionCookieOptions(configService),
		store: new RedisStore({
			client: redisService,
			prefix: configService.getOrThrow<string>('SESSION_FOLDER')
		})
	});
}
