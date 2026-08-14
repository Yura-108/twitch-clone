import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { type GqlContext } from '@/src/shared/types/gql-context.types';

@Injectable()
export class GqlAuthGuard implements CanActivate {
	public constructor(private readonly prismaService: PrismaService) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const ctx = GqlExecutionContext.create(context);
		const { req } = ctx.getContext<GqlContext>();

		if (typeof req.session.userId === 'undefined') {
			throw new UnauthorizedException('User is not authorized');
		}

		const user = await this.prismaService.user.findUnique({
			where: {
				id: req.session.userId
			}
		});

		if (!user) {
			throw new UnauthorizedException('User is not authorized');
		}

		req.user = user;

		return true;
	}
}
