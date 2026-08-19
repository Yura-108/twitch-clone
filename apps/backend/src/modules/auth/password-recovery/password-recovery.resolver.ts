import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';

import { UserModel } from '@/src/modules/auth/account/models/user.model';
import { NewPasswordInput } from '@/src/modules/auth/password-recovery/inputs/new-password.input';
import { ResetPasswordInput } from '@/src/modules/auth/password-recovery/inputs/reset-password.input';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { UserAgent } from '@/src/shared/decorators/user-agent.decorator';
import type { GqlContext } from '@/src/shared/types/gql-context.types';

import { PasswordRecoveryService } from './password-recovery.service';

@Resolver('PasswordRecovery')
export class PasswordRecoveryResolver {
	constructor(
		private readonly passwordRecoveryService: PasswordRecoveryService
	) {}

	@Authorization()
	@Mutation(() => UserModel, { name: 'ResetPassword' })
	public async ResetPassword(
		@Context() { req }: GqlContext,
		@Args('data') input: ResetPasswordInput,
		@UserAgent() userAgent: string
	) {
		return this.passwordRecoveryService.ResetPassword(req, input, userAgent);
	}

	@Mutation(() => UserAgent, { name: 'NewPassword' })
	public async NewPassword(@Args('data') input: NewPasswordInput) {
		return this.passwordRecoveryService.newPassword(input);
	}
}
