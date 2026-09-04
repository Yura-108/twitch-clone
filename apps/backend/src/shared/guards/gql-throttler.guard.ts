import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { type GqlContext } from '@/src/shared/types/gql-context.types';
import { getClientIp } from '@/src/shared/utils/session-metadata.util';

// Subscriptions are served over a websocket, so there is no response to write
// rate-limit headers to. The guard still has to count the operation, hence a
// sink instead of an early return.
function createResponseStub(): Response {
	return {
		header: () => undefined
	} as unknown as Response;
}

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
			GqlExecutionContext.create(context).getContext<Partial<GqlContext>>();

		return { req: req as Request, res: res ?? createResponseStub() };
	}

	protected async getTracker(req: Record<string, any>): Promise<string> {
		return req.session?.userId ?? getClientIp(req as Request);
	}

	protected async throwThrottlingException(): Promise<void> {
		throw new ThrottlerException('Too many requests. Please try again later.');
	}
}
