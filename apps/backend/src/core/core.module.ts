import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';

import { getGraphQLConfig } from '@/src/core/config/graphql.config';
import { PrismaModule } from '@/src/core/prisma/prisma.module';
import { AccountModule } from '@/src/modules/auth/account/account.module';
import { PasswordRecoveryModule } from '@/src/modules/auth/password-recovery/password-recovery.module';
import { SessionModule } from '@/src/modules/auth/session/session.module';
import { VerificationModule } from '@/src/modules/auth/verification/verification.module';
import { MailModule } from '@/src/modules/libs/mail/mail.module';
import { IS_DEV_ENV } from '@/src/shared/utils/is-dev.utils';

import { RedisModule } from './redis/redis.module';

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
		AccountModule,
		SessionModule,
		VerificationModule,
		PasswordRecoveryModule
	]
})
export class CoreModule {}
