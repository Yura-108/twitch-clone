import { TOTP } from 'otpauth';

export function createTotp(email: string, secret: string): TOTP {
	return new TOTP({
		issuer: 'Twitch',
		label: email,
		algorithm: 'SHA1',
		digits: 6,
		secret
	});
}

export function verifyTotpPin(
	email: string,
	secret: string,
	pin: string
): boolean {
	return createTotp(email, secret).validate({ token: pin }) !== null;
}
