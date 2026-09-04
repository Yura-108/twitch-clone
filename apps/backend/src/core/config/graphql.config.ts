import type { ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { IncomingMessage } from 'http';
import { join } from 'path';

import { getSessionMiddleware } from '@/src/core/config/session.config';
import { RedisService } from '@/src/core/redis/redis.service';
import { isDev } from '@/src/shared/utils/is-dev.utils';

// The websocket handshake never writes a response, so express-session only
// needs an object it can safely decorate while it loads the session.
function createResponseStub(): Response {
	const noop = () => undefined;

	return {
		getHeader: noop,
		setHeader: noop,
		removeHeader: noop,
		writeHead: noop,
		end: noop
	} as unknown as Response;
}

export function getGraphQLConfig(
	configService: ConfigService,
	redisService: RedisService
): ApolloDriverConfig {
	const sessionMiddleware = getSessionMiddleware(configService, redisService);

	function loadSession(request: IncomingMessage) {
		return new Promise<void>((resolve, reject) => {
			sessionMiddleware(request as Request, createResponseStub(), error =>
				error ? reject(error) : resolve()
			);
		});
	}

	return {
		playground: isDev(configService),
		path: configService.getOrThrow<string>('GRAPHQL_PREFIX'),
		autoSchemaFile: join(process.cwd(), 'src/core/graphql/schema.gql'),
		sortSchema: true,
		// Apollo calls this with { req, res }, graphql-ws with its own connection
		// context, so both shapes are normalised to the GqlContext the guards expect.
		context: (context: any) => {
			const upgradeRequest = context?.extra?.request as
				IncomingMessage | undefined;

			if (upgradeRequest) {
				return { req: upgradeRequest };
			}

			return { req: context.req, res: context.res };
		},
		subscriptions: {
			'graphql-ws': {
				onConnect: async context => {
					const { request } = context.extra as { request: IncomingMessage };

					await loadSession(request);
				}
			}
		}
	};
}
