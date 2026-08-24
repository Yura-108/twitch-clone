import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType, User } from '@prisma/generated/client';
import { verify } from 'argon2';
import { Request } from 'express';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { DeactivateAccountInput } from '@/src/modules/auth/deactivate/inputs/deactivate-account.input';
import { SessionService } from '@/src/modules/auth/session/session.service';
import { MailService } from '@/src/modules/libs/mail/mail.service';
import { generateToken } from '@/src/shared/utils/generate-token.util';
import { getSessionMetadata } from '@/src/shared/utils/session-metadata.util';
import { destroySession } from '@/src/shared/utils/session.util';

@Injectable()
export class DeactivateService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly mailService: MailService,
		private readonly sessionService: SessionService,
		private readonly configService: ConfigService
	) {}

	public async deactivateAccount(
		req: Request,
		user: User,
		input: DeactivateAccountInput,
		userAgent: string
	) {
		const { email, password, pin } = input;

		if (user.isDeactivated) {
			throw new BadRequestException('Account is already deactivated.');
		}

		if (user.email !== email) {
			throw new BadRequestException('Email is not valid.');
		}

		const isValidPassword = await verify(user.password, password);

		if (!isValidPassword) {
			throw new BadRequestException('Password is not valid.');
		}

		if (!pin) {
			await this.sendDeactivateToken(req, user, userAgent);

			return { message: 'A confirmation code is required.' };
		}

		const deactivatedUser = await this.validateDeactivateToken(req, user, pin);

		return { user: deactivatedUser };
	}

	private async sendDeactivateToken(
		req: Request,
		user: User,
		userAgent: string
	) {
		const deactivateToken = await generateToken(
			this.prismaService,
			user,
			TokenType.DEACTIVATE_ACCOUNT,
			false
		);

		const metadata = getSessionMetadata(req, userAgent);

		await this.mailService.sendDeactivateToken(
			user.email,
			deactivateToken.token,
			metadata
		);

		return true;
	}

	private async validateDeactivateToken(req: Request, user: User, pin: string) {
		// Scoped to this user AND this token type. Without either filter a
		// six-digit pin could be brute-forced against somebody else's account, or
		// a token issued for email verification would pass as a deactivation code.
		const existingToken = await this.prismaService.token.findUnique({
			where: {
				token: pin,
				type: TokenType.DEACTIVATE_ACCOUNT,
				userId: user.id
			}
		});

		if (!existingToken) {
			throw new NotFoundException('Token not found');
		}

		const hasExpired = new Date(existingToken.expiresIn) < new Date();

		if (hasExpired) {
			throw new NotFoundException('Token has expired');
		}

		const deactivatedUser = await this.prismaService.user.update({
			where: { id: user.id },
			data: {
				isDeactivated: true,
				deactivatedAt: new Date()
			}
		});

		await this.prismaService.token.delete({
			where: {
				id: existingToken.id,
				type: TokenType.DEACTIVATE_ACCOUNT
			}
		});

		await this.sessionService.removeAllForUser(user.id);
		await destroySession(req, this.configService);

		return deactivatedUser;
	}
}
