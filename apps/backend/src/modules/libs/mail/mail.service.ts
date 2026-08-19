import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from 'react-email';

import { VerificationTemplate } from '@/src/modules/libs/mail/templates/verification.template';

@Injectable()
export class MailService {
	public constructor(
		private readonly mailerService: MailerService,
		private readonly configService: ConfigService
	) {}

	public async sendVerificationToken(email: string, token: string) {
		// Trailing slash stripped here so the template can always join with '/'
		// regardless of how ALLOWED_ORIGIN happens to be written.
		const domain = this.configService
			.getOrThrow<string>('ALLOWED_ORIGIN')
			.replace(/\/$/, '');
		const html = await render(VerificationTemplate({ domain, token }));

		return this.sendMail(email, 'verification account', html);
	}

	private sendMail(email: string, subject: string, html: string) {
		return this.mailerService.sendMail({
			to: email,
			subject,
			html
		});
	}
}
