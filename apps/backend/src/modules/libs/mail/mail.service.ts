import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from 'react-email';

import { AccountDeactivationTemplate } from '@/src/modules/libs/mail/templates/account-deactivation.template';
import { PasswordRecoveryTemplate } from '@/src/modules/libs/mail/templates/password-recovery.template';
import { VerificationTemplate } from '@/src/modules/libs/mail/templates/verification.template';
import { SessionMetadata } from '@/src/shared/types/session-metadata.types';
import {AccountDeletionTemplate} from "@/src/modules/libs/mail/templates/account-deletion.template";

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
		const domain = this.configService
			.getOrThrow<string>('ALLOWED_ORIGIN')
			.replace(/\/$/, '');
		const html = await render(
			PasswordRecoveryTemplate({ domain, token, metadata })
		);

		return this.sendMail(email, 'reset password', html);
	}

	public async sendDeactivateToken(
		email: string,
		token: string,
		metadata: SessionMetadata
	) {
		const html = await render(AccountDeactivationTemplate({ token, metadata }));

		return this.sendMail(email, 'deactivate account', html);
	}

	public async sendAccountDeletion(email: string) {
		const domain = this.configService
			.getOrThrow<string>('ALLOWED_ORIGIN')
			.replace(/\/$/, '');
		const html = await render(
			AccountDeletionTemplate({domain})
		);

		return this.sendMail(email, 'account deleted', html);
	}

	private sendMail(email: string, subject: string, html: string) {
		return this.mailerService.sendMail({
			to: email,
			subject,
			html
		});
	}
}
