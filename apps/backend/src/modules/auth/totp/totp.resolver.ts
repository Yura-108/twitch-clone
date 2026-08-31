import { Args, Mutation, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';

import { DisableTotpInput } from '@/src/modules/auth/totp/inputs/disable-totp.input';
import { EnableTotpInput } from '@/src/modules/auth/totp/inputs/enable-totp.input';
import { TotpModel } from '@/src/modules/auth/totp/models/totp.model';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { TotpService } from './totp.service';

@Resolver(() => TotpModel)
export class TotpResolver {
	public constructor(private readonly totpService: TotpService) {}

	@Authorization()
	@Mutation(() => TotpModel, { name: 'generateTotp' })
	public async generate(@Authorized() user: User) {
		return this.totpService.generate(user);
	}

	@Authorization()
	@Mutation(() => [String], { name: 'enableTotp' })
	public async enable(
		@Authorized() user: User,
		@Args('data') input: EnableTotpInput
	) {
		return this.totpService.enable(user, input);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'disableTotp' })
	public async disable(
		@Authorized() user: User,
		@Args('data') input: DisableTotpInput
	) {
		return this.totpService.disable(user, input);
	}
}
