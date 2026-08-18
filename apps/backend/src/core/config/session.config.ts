import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

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
