import { seconds, Throttle } from '@nestjs/throttler';

// Every limit in one place. Each overrides the global default for the handler
// it is put on; counters are already keyed per handler, so these do not share
// a budget with each other.

// Password and token guessing: login, registration, reset confirmation,
// email verification.
export function ThrottleAuth() {
	return Throttle({ default: { limit: 5, ttl: seconds(60) } });
}

// Anything that sends an email. The tight window is about the SMTP quota as
// much as about the user's inbox.
export function ThrottleMail() {
	return Throttle({ default: { limit: 3, ttl: seconds(900) } });
}

// Six-digit pins and recovery codes. A recovery-code attempt costs eight
// argon2 verifications, so this caps CPU burn as well as guessing.
export function ThrottleOtp() {
	return Throttle({ default: { limit: 5, ttl: seconds(60) } });
}

// Uploads run the file through sharp and then push it to S3.
export function ThrottleUpload() {
	return Throttle({ default: { limit: 10, ttl: seconds(3600) } });
}
