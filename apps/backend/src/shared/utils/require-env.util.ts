import type { ConfigService } from '@nestjs/config';

// getOrThrow() only catches undefined. An empty string is a defined value to
// it, so a blank variable sails through, the config silently falls back to the
// library's own defaults, and the failure surfaces at runtime somewhere else
// entirely — an empty MAIL_HOST becomes a connection attempt to localhost.
export function requireEnv(configService: ConfigService, key: string): string {
	const value = configService.getOrThrow<string>(key).trim();

	if (!value) {
		throw new Error(`Environment variable ${key} is set but empty.`);
	}

	return value;
}
