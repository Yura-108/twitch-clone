import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { seconds, type ThrottlerModuleOptions } from '@nestjs/throttler';

import { RedisService } from '@/src/core/redis/redis.service';

// Counters are keyed per handler, so this is a ceiling for any single
// operation rather than a shared budget across the whole API. Sensitive
// handlers tighten it through the decorators in shared/decorators/throttle.
export const DEFAULT_LIMIT = 120;
export const DEFAULT_TTL = seconds(60);

export function getThrottlerConfig(
	redisService: RedisService
): ThrottlerModuleOptions {
	return {
		throttlers: [
			{
				name: 'default',
				ttl: DEFAULT_TTL,
				limit: DEFAULT_LIMIT
			}
		],
		// Passing the shared client, not a URL: the storage only disconnects
		// connections it opened itself, so the app's Redis stays untouched.
		storage: new ThrottlerStorageRedisService(redisService)
	};
}
