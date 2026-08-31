import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, key: Buffer): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const ciphertext = Buffer.concat([
		cipher.update(plaintext, 'utf8'),
		cipher.final()
	]);

	return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
		'base64'
	);
}

export function decrypt(payload: string, key: Buffer): string {
	const raw = Buffer.from(payload, 'base64');

	if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
		throw new Error('Encrypted payload is malformed.');
	}

	const iv = raw.subarray(0, IV_LENGTH);
	const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	return Buffer.concat([
		decipher.update(ciphertext),
		decipher.final()
	]).toString('utf8');
}
