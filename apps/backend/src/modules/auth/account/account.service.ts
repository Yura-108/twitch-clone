import {
	ConflictException,
	Injectable,
	UnauthorizedException
} from '@nestjs/common';
import type { User } from '@prisma/generated/client';
import { hash, verify } from 'argon2';
import type { Request } from 'express';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { ChangeEmailInput } from '@/src/modules/auth/account/inputs/change-email.input';
import { ChangePasswordInput } from '@/src/modules/auth/account/inputs/change-password.input';
import { CreateUserInput } from '@/src/modules/auth/account/inputs/create-user.input';
import { SessionService } from '@/src/modules/auth/session/session.service';
import { VerificationService } from '@/src/modules/auth/verification/verification.service';

@Injectable()
export class AccountService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly verificationService: VerificationService,
		private readonly sessionService: SessionService
	) {}

	public async me(id: string) {
		return await this.prismaService.user.findUnique({
			where: { id }
		});
	}

	public async create(input: CreateUserInput) {
		const { username, password, email } = input;

		const isUsernameExists = await this.prismaService.user.findUnique({
			where: { username }
		});

		if (isUsernameExists) {
			throw new ConflictException('Username already exists');
		}

		const isEmailExists = await this.prismaService.user.findUnique({
			where: { email }
		});

		if (isEmailExists) {
			throw new ConflictException('Email already exists');
		}

		const user = await this.prismaService.user.create({
			data: {
				username,
				email,
				password: await hash(password),
				displayName: username,
				stream: {
					create: {
						title: `Stream ${username}`
					}
				}
			}
		});

		await this.verificationService.sendVerificationToken(user);

		return true;
	}

	public async changeEmail(user: User, input: ChangeEmailInput) {
		const { email } = input;

		await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: {
				email
			}
		});

		return true;
	}

	public async changePassword(
		req: Request,
		user: User,
		input: ChangePasswordInput
	) {
		const { oldPassword, newPassword } = input;

		const isPasswordValid = await verify(user.password, oldPassword);

		if (!isPasswordValid) {
			throw new UnauthorizedException('Password is not valid');
		}

		await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: {
				password: await hash(newPassword)
			}
		});

		await this.sessionService.removeAllForUser(user.id, req.session.id);

		return true;
	}
}
