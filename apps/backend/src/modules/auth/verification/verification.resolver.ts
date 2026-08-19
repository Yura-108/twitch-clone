import {Context, Mutation, Resolver} from '@nestjs/graphql';

import { VerificationService } from './verification.service';
import {User} from "@prisma/generated/client";
import {Authorization} from "@/src/shared/decorators/auth.decorator";
import type {GqlContext} from "@/src/shared/types/gql-context.types";

@Resolver('Verification')
export class VerificationResolver {
	public constructor(
		private readonly verificationService: VerificationService
	) {}

	@Authorization()
	@Mutation(() => String)
	public async sendVerificationToken(@Context() { req }: GqlContext) {
		return this.verificationService.sendVerificationToken(req.user as User);
	}
}
