import { ConfigService } from '@nestjs/config';

import { requireEnv } from '@/src/shared/utils/require-env.util';

const KEY_LENGTH = 32;

export function getEncryptionKey(configService: ConfigService): Buffer {
	const value = requireEnv(configService, 'TOTP_ENCRYPTION_KEY');

	if (!/^[0-9a-fA-F]+$/.test(value)) {
		throw new Error(
			'Environment variable TOTP_ENCRYPTION_KEY must be hex-encoded.'
		);
	}

	const key = Buffer.from(value, 'hex');

	if (key.length !== KEY_LENGTH) {
		throw new Error(
			`Environment variable TOTP_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes, got ${key.length}.`
		);
	}

	return key;
}
