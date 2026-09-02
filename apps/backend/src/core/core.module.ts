import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';

import { getGraphQLConfig } from '@/src/core/config/graphql.config';
import { getLiveKitConfig } from '@/src/core/config/livekit.config';
import { getThrottlerConfig } from '@/src/core/config/throttler.config';
import { PrismaModule } from '@/src/core/prisma/prisma.module';
import { AuthModule } from '@/src/modules/auth/auth.module';
import { CategoryModule } from '@/src/modules/category/category.module';
import { ChannelModule } from '@/src/modules/channel/channel.module';
import { CronModule } from '@/src/modules/cron/cron.module';
import { FollowModule } from '@/src/modules/follow/follow.module';
import { LivekitModule } from '@/src/modules/libs/livekit/livekit.module';
import { MailModule } from '@/src/modules/libs/mail/mail.module';
import { StorageModule } from '@/src/modules/libs/storage/storage.module';
import { IngressModule } from '@/src/modules/stream/ingress/ingress.module';
import { StreamModule } from '@/src/modules/stream/stream.module';
import { GqlThrottlerGuard } from '@/src/shared/guards/gql-throttler.guard';
import { IS_DEV_ENV } from '@/src/shared/utils/is-dev.utils';

import { RedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';
import {WebhookModule} from "@/src/modules/webhook/webhook.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			envFilePath: '../../.env',
			ignoreEnvFile: !IS_DEV_ENV,
			isGlobal: true
		}),
		GraphQLModule.forRootAsync({
			driver: ApolloDriver,
			useFactory: getGraphQLConfig,
			inject: [ConfigService]
		}),
		PrismaModule,
		RedisModule,
		ThrottlerModule.forRootAsync({
			useFactory: getThrottlerConfig,
			inject: [RedisService]
		}),
		LivekitModule.registerAsync({
			imports: [ConfigModule],
			useFactory: getLiveKitConfig,
			inject: [ConfigService]
		}),
		MailModule,
		StorageModule,
		AuthModule,
		CronModule,
		StreamModule,
		CategoryModule,
		ChannelModule,
		FollowModule,
		IngressModule,
		WebhookModule
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: GqlThrottlerGuard
		}
	]
})
export class CoreModule {}
