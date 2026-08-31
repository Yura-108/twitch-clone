import { Module } from '@nestjs/common';

import { RecoveryCodeService } from './recovery-code.service';
import { TotpResolver } from './totp.resolver';
import { TotpService } from './totp.service';

@Module({
	providers: [TotpResolver, TotpService, RecoveryCodeService],
	exports: [RecoveryCodeService]
})
export class TotpModule {}
