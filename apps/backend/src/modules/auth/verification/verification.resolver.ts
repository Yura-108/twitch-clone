import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';

import { UserModel } from '@/src/modules/auth/account/models/user.model';
import { VerificationInput } from '@/src/modules/auth/verification/inputs/verification.input';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { UserAgent } from '@/src/shared/decorators/user-agent.decorator';
import type { GqlContext } from '@/src/shared/types/gql-context.types';

import { VerificationService } from './verification.service';

@Resolver(() => UserModel)
export class VerificationResolver {
	public constructor(
		private readonly verificationService: VerificationService
	) {}

	@Mutation(() => UserModel, { name: 'verifyAccount' })
	public async verify(
		@Context() { req }: GqlContext,
		@Args('data') input: VerificationInput,
		@UserAgent() userAgent: string
	) {
		return this.verificationService.verify(req, input, userAgent);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'sendVerificationToken' })
	public async sendToken(@Context() { req }: GqlContext) {
		return this.verificationService.sendVerificationToken(req.user as User);
	}
}
