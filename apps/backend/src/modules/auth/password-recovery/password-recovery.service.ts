import {Injectable, NotAcceptableException, NotFoundException} from '@nestjs/common';
import { TokenType } from '@prisma/generated/enums';
import { hash } from 'argon2';
import { Request } from 'express';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { NewPasswordInput } from '@/src/modules/auth/password-recovery/inputs/new-password.input';
import { ResetPasswordInput } from '@/src/modules/auth/password-recovery/inputs/reset-password.input';
import { getSessionMetadata } from '@/src/shared/utils/session-metadata.util';
import {generateToken} from "@/src/shared/utils/generate-token.util";
import {MailService} from "@/src/modules/libs/mail/mail.service";

@Injectable()
export class PasswordRecoveryService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly mailService: MailService,
	) {}

	public async ResetPassword(
		req: Request,
		input: ResetPasswordInput,
		userAgent: string
	) {
		const { email } = input;

		const user = await this.prismaService.user.findUnique({
			where: { email }
		});

		if (!user) {
			throw new NotAcceptableException('User not found');
		}

		const resetToken = await generateToken(
			this.prismaService,
			user,
			TokenType.PASSWORD_RESET
		);

		const metadata= getSessionMetadata(req, userAgent);

		await this.mailService.sendPasswordResetToken(email, resetToken.token, metadata);

		return true;
	}

	public async newPassword(newPasswordInput: NewPasswordInput) {
		const { password, token } = newPasswordInput;

		const existingToken = await this.prismaService.token.findUnique({
			where: { token, type: TokenType.PASSWORD_RESET }
		});

		if (!existingToken) {
			throw new NotFoundException('Token not found');
		}

		const hasExpired = new Date(existingToken.expiresIn) < new Date();

		if (hasExpired) {
			throw new NotFoundException('Token has expired');
		}

		await this.prismaService.user.update({
			where: {
				id: existingToken.userId
			},
			data: {
				password: await hash(password)
			}
		});

		await this.prismaService.token.delete({
			where: {
				id: existingToken.id,
				type: TokenType.EMAIL_VERIFY
			}
		});

		return true;
	}
}
