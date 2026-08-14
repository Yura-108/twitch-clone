import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';

import { CreateUserInput } from '@/src/modules/auth/account/inputs/create-user.input';
import { UserModel } from '@/src/modules/auth/account/models/user.model';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { AccountService } from './account.service';

@Resolver('Account')
export class AccountResolver {
	public constructor(private readonly accountService: AccountService) {}

	@Authorization()
	@Query(() => UserModel, { name: 'findProfile' })
	public async me(@Authorized() user: User) {
		return user;
	}

	@Query(() => [UserModel], { name: 'findAllUsers' })
	public async findAll() {
		return this.accountService.findAll();
	}

	@Mutation(() => Boolean, { name: 'createUser' })
	public async create(@Args('data') input: CreateUserInput) {
		return this.accountService.create(input);
	}
}
