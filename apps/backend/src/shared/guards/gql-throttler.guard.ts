import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { type GqlContext } from '@/src/shared/types/gql-context.types';
import { getClientIp } from '@/src/shared/utils/session-metadata.util';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
	protected getRequestResponse(context: ExecutionContext): {
		req: Request;
		res: Response;
	} {
		if (context.getType() === 'http') {
			return {
				req: context.switchToHttp().getRequest<Request>(),
				res: context.switchToHttp().getResponse<Response>()
			};
		}

		const { req, res } =
			GqlExecutionContext.create(context).getContext<GqlContext>();

		return { req, res };
	}

	protected async getTracker(req: Record<string, any>): Promise<string> {
		return req.session?.userId ?? getClientIp(req as Request);
	}

	protected async throwThrottlingException(): Promise<void> {
		throw new ThrottlerException('Too many requests. Please try again later.');
	}
}
