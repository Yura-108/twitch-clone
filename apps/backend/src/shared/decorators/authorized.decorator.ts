import {
	createParamDecorator,
	type ExecutionContext,
	UnauthorizedException
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';
import type { Request } from 'express';

import { type GqlContext } from '@/src/shared/types/gql-context.types';

export const Authorized = createParamDecorator(
	(data: keyof User | undefined, ctx: ExecutionContext) => {
		let request: Request;

		if (ctx.getType() === 'http') {
			request = ctx.switchToHttp().getRequest<Request>();
		} else {
			request = GqlExecutionContext.create(ctx).getContext<GqlContext>().req;
		}

		const { user } = request;

		if (!user) {
			throw new UnauthorizedException(
				'@Authorized() requires @Authorization() on the same handler.'
			);
		}

		return data ? user[data] : user;
	}
);
