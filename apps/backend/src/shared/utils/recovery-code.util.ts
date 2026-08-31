import { encode } from 'hi-base32';
import { randomBytes } from 'node:crypto';

export const RECOVERY_CODES_COUNT = 8;

const BYTES_PER_CODE = 10;
const GROUP_SIZE = 4;

// Crockford-free base32 alphabet as produced by hi-base32: A-Z and 2-7.
const ALLOWED_CHARS = /[^A-Z2-7]/g;

export function generateRecoveryCodes(
	count: number = RECOVERY_CODES_COUNT
): string[] {
	return Array.from({ length: count }, () =>
		group(encode(randomBytes(BYTES_PER_CODE)).replace(/=/g, ''))
	);
}

export function normalizeRecoveryCode(input: string): string {
	return group(input.toUpperCase().replace(ALLOWED_CHARS, ''));
}

function group(value: string): string {
	const groups: string[] = [];

	for (let i = 0; i < value.length; i += GROUP_SIZE) {
		groups.push(value.slice(i, i + GROUP_SIZE));
	}

	return groups.join('-');
}
