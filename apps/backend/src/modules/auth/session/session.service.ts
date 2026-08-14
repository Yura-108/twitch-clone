import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'argon2';
import { Request } from 'express';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { LoginInput } from '@/src/modules/auth/session/inputs/login.input';

@Injectable()
export class SessionService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService
	) {}

	public async login(req: Request, input: LoginInput) {
		const { login, password } = input;

		const user = await this.prismaService.user.findFirst({
			where: {
				OR: [{ username: { equals: login } }, { email: { equals: login } }]
			}
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		const isValidPassword = await verify(user.password, password);

		if (!isValidPassword) {
			throw new UnauthorizedException('Invalid password');
		}

		return new Promise((resolve, reject) => {
			req.session.createdAt = new Date();
			req.session.userId = user.id;

			req.session.save(err => {
				if (err) {
					console.log(err);
					return reject(new InternalServerErrorException('No saved session'));
				}

				resolve(user);
			});
		});
	}

	public async logout(req: Request) {
		return new Promise((resolve, reject) => {
			req.session.destroy(err => {
				if (err) {
					return reject(
						new InternalServerErrorException('No destroyed session')
					);
				}
				req.res?.clearCookie(
					this.configService.getOrThrow<string>('SESSION_NAME')
				);
				resolve(true);
			});
		});
	}
}
