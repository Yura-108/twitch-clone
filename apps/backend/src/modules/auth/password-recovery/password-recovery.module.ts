import { Module } from '@nestjs/common';

import { SessionModule } from '@/src/modules/auth/session/session.module';

import { PasswordRecoveryResolver } from './password-recovery.resolver';
import { PasswordRecoveryService } from './password-recovery.service';

@Module({
	imports: [SessionModule],
	providers: [PasswordRecoveryResolver, PasswordRecoveryService]
})
export class PasswordRecoveryModule {}
