import { Args, Mutation, registerEnumType, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';
import { IngressInput } from 'livekit-server-sdk';

import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { IngressService } from './ingress.service';

registerEnumType(IngressInput, { name: 'IngressInput' });

@Resolver('Ingress')
export class IngressResolver {
	constructor(private readonly ingressService: IngressService) {}

	@Authorization()
	@Mutation(() => Boolean, { name: 'createIngress' })
	public async create(
		@Authorized() user: User,
		@Args('ingressType', { type: () => IngressInput }) ingressType: IngressInput
	) {
		return this.ingressService.create(user, ingressType);
	}
}
