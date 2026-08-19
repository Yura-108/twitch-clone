import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from 'react-email';

import { VerificationTemplate } from '@/src/modules/libs/mail/templates/verification.template';
import {SessionMetadata} from "@/src/shared/types/session-metadata.types";

@Injectable()
export class MailService {
	public constructor(
		private readonly mailerService: MailerService,
		private readonly configService: ConfigService
	) {}

	public async sendVerificationToken(email: string, token: string) {
		const domain = this.configService
			.getOrThrow<string>('ALLOWED_ORIGIN')
			.replace(/\/$/, '');
		const html = await render(VerificationTemplate({ domain, token }));

		return this.sendMail(email, 'verification account', html);
	}

	public async sendPasswordResetToken(
		email: string,
		token: string,
		metadata: SessionMetadata
	) {

	}

	private sendMail(email: string, subject: string, html: string) {
		return this.mailerService.sendMail({
			to: email,
			subject,
			html
		});
	}
}
