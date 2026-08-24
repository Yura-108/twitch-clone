import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {hash, verify} from 'argon2';

import {PrismaService} from '@/src/core/prisma/prisma.service';
import {CreateUserInput} from '@/src/modules/auth/account/inputs/create-user.input';
import type {User} from "@prisma/generated/client";
import {ChangePasswordInput} from "@/src/modules/auth/account/inputs/change-password.input";
import {ChangeEmailInput} from "@/src/modules/auth/account/inputs/change-email.input";

@Injectable()
export class AccountService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async me(id: string) {
		return await this.prismaService.user.findUnique({
			where: {id}
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

		await this.prismaService.user.create({
			data: {
				username,
				email,
				password: await hash(password),
				displayName: username
			}
		});

		return true;
	}

	public async changeEmail(user: User, input: ChangeEmailInput) {
		const { email } = input;

		await this.prismaService.user.update({
			where: {
				id: user.id,
			},
			data: {
				email
			}
		});

		return true;
	}

	public async changePassword(user: User, input: ChangePasswordInput) {
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

		return true;
	}
}
