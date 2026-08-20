import { Args, Mutation, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';

import { EnableTotpInput } from '@/src/modules/auth/totp/totp/inputs/enable-totp.input';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { TotpService } from './totp.service';
import {TotpModel} from "@/src/modules/auth/totp/totp/models/totp.model";

@Resolver('Totp')
export class TotpResolver {
	constructor(private readonly totpService: TotpService) {}

	@Authorization()
	@Mutation(() => TotpModel, { name: 'generateTotp' })
	public async generate(@Authorized() user: User) {
		return this.totpService.generate(user);
	}

	@Mutation(() => Boolean, { name: 'enableTotp' })
	public async enable(
		@Authorized() user: User,
		@Args('data') input: EnableTotpInput
	) {
		return this.totpService.enable(user, input);
	}

	@Mutation(() => Boolean, { name: 'disableTotp' })
	public async disable(@Authorized() user: User) {
		return this.totpService.disable(user);
	}
}
