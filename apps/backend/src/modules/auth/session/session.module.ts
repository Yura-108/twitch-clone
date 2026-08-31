import { Module } from '@nestjs/common';

import { TotpModule } from '@/src/modules/auth/totp/totp.module';
import { VerificationModule } from '@/src/modules/auth/verification/verification.module';

import { SessionResolver } from './session.resolver';
import { SessionService } from './session.service';

@Module({
	imports: [VerificationModule, TotpModule],
	providers: [SessionResolver, SessionService],
	exports: [SessionService]
})
export class SessionModule {}
