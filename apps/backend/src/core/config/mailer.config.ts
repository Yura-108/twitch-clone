import { MailerOptions } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

import { requireEnv } from '@/src/shared/utils/require-env.util';

export function getMailerConfig(configService: ConfigService): MailerOptions {
	const login = requireEnv(configService, 'MAIL_LOGIN');
	const port = Number(requireEnv(configService, 'MAIL_PORT'));

	if (!Number.isInteger(port)) {
		throw new Error(`Environment variable MAIL_PORT must be a number.`);
	}

	return {
		transport: {
			host: requireEnv(configService, 'MAIL_HOST'),
			port,
			// 465 speaks TLS from the first byte; 587 and 2525 start plain and
			// upgrade via STARTTLS, which nodemailer does on its own.
			secure: port === 465,
			auth: {
				user: login,
				pass: requireEnv(configService, 'MAIL_PASSWORD')
			}
		},
		defaults: {
			from: `"Twitch" <${login}>`
		}
	};
}
