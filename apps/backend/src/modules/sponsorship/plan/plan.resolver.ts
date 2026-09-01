import {Args, Mutation, Query, Resolver} from '@nestjs/graphql';

import { PlanService } from './plan.service';
import {PlanModel} from "@/src/modules/sponsorship/plan/models/plan.model";
import {Authorization} from "@/src/shared/decorators/auth.decorator";
import {Authorized} from "@/src/shared/decorators/authorized.decorator";
import type {User} from "@prisma/generated/client";
import {CreatePlanInput} from "@/src/modules/sponsorship/plan/inputs/create-plan.input";

@Resolver('Plan')
export class PlanResolver {
	constructor(private readonly planService: PlanService) {}

	@Authorization()
	@Query(() => [PlanModel], { name: "findMyPlans" })
	public async findMyPlans(@Authorized() user: User) {
		return this.planService.findMyPlans(user);
	}

	@Authorization()
	@Mutation(() => Boolean, {name: 'createMyPlan'})
	public async create(
		@Authorized() user: User,
		@Args('data') input: CreatePlanInput,
	) {
		return this.planService.create(user, input);
	}

	@Authorization()
	@Mutation(() => Boolean, {name: 'removeMyPlan'})
	public async remove(
		@Authorized() user: User,
		@Args('planId') planId: string,
	) {
		return this.planService.remove(user, planId);
	}
}
