import { Module } from '@nestjs/common';

import { SessionModule } from '@/src/modules/auth/session/session.module';
import { VerificationModule } from '@/src/modules/auth/verification/verification.module';

import { AccountResolver } from './account.resolver';
import { AccountService } from './account.service';

@Module({
	imports: [VerificationModule, SessionModule],
	providers: [AccountResolver, AccountService]
})
export class AccountModule {}
