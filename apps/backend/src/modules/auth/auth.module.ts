import { Module } from '@nestjs/common';

import { AccountModule } from '@/src/modules/auth/account/account.module';
import { DeactivateModule } from '@/src/modules/auth/deactivate/deactivate.module';
import { PasswordRecoveryModule } from '@/src/modules/auth/password-recovery/password-recovery.module';
import { ProfileModule } from '@/src/modules/auth/profile/profile.module';
import { SessionModule } from '@/src/modules/auth/session/session.module';
import { TotpModule } from '@/src/modules/auth/totp/totp.module';
import { VerificationModule } from '@/src/modules/auth/verification/verification.module';

@Module({
	imports: [
		AccountModule,
		PasswordRecoveryModule,
		SessionModule,
		TotpModule,
		VerificationModule,
		DeactivateModule,
		ProfileModule
	]
})
export class AuthModule {}
