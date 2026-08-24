import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';

import { AuthModel } from '@/src/modules/auth/account/models/auth.model';
import { DeactivateAccountInput } from '@/src/modules/auth/deactivate/inputs/deactivate-account.input';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';
import { UserAgent } from '@/src/shared/decorators/user-agent.decorator';
import type { GqlContext } from '@/src/shared/types/gql-context.types';

import { DeactivateService } from './deactivate.service';

@Resolver(() => AuthModel)
export class DeactivateResolver {
	public constructor(private readonly deactivateService: DeactivateService) {}

	@Authorization()
	@Mutation(() => AuthModel, { name: 'deactivateAccount' })
	public async deactivateAccount(
		@Context() { req }: GqlContext,
		@Args('data') input: DeactivateAccountInput,
		@UserAgent() userAgent: string,
		@Authorized() user: User
	) {
		return this.deactivateService.deactivateAccount(
			req,
			user,
			input,
			userAgent
		);
	}
}
