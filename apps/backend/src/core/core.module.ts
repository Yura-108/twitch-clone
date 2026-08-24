import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';

import { getGraphQLConfig } from '@/src/core/config/graphql.config';
import { PrismaModule } from '@/src/core/prisma/prisma.module';
import { AuthModule } from '@/src/modules/auth/auth.module';
import { MailModule } from '@/src/modules/libs/mail/mail.module';
import { IS_DEV_ENV } from '@/src/shared/utils/is-dev.utils';

import { RedisModule } from './redis/redis.module';
import {CronModule} from "@/src/modules/cron/cron.module";

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
		MailModule,
		AuthModule,
		CronModule
	]
})
export class CoreModule {}
