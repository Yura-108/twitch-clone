import {
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/generated/client';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { StripeService } from '@/src/modules/libs/stripe/stripe.service';
import { CreatePlanInput } from '@/src/modules/sponsorship/plan/inputs/create-plan.input';
import { requireEnv } from '@/src/shared/utils/require-env.util';

@Injectable()
export class PlanService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly stripeService: StripeService,
		private readonly configService: ConfigService
	) {}

	public async findMyPlans(user: User) {
		return this.prismaService.sponsorshipPlan.findMany({
			where: {
				channelId: user.id
			},
			orderBy: {
				createdAt: 'desc'
			}
		});
	}

	public async create(user: User, input: CreatePlanInput) {
		const { title, description, price } = input;

		const channel = await this.prismaService.user.findUnique({
			where: {
				id: user.id
			}
		});

		if (!channel || !channel.isVerified) {
			throw new ForbiddenException(
				'Creating plans is available only to verified channels.'
			);
		}

		const stripeProduct = await this.stripeService.products.create({
			name: title,
			description
		});

		let stripePriceId: string;

		try {
			const stripePrice = await this.stripeService.prices.create({
				product: stripeProduct.id,
				unit_amount: Math.round(price * 100),
				currency: this.currency,
				recurring: {
					interval: 'month'
				}
			});

			stripePriceId = stripePrice.id;
		} catch (error) {
			await this.archiveInStripe(stripeProduct.id);

			throw error;
		}

		try {
			await this.prismaService.sponsorshipPlan.create({
				data: {
					title,
					description,
					price,
					stripeProductId: stripeProduct.id,
					stripePlanId: stripePriceId,
					channel: {
						connect: {
							id: user.id
						}
					}
				}
			});
		} catch (error) {
			await this.archiveInStripe(stripeProduct.id, stripePriceId);

			throw error;
		}

		return true;
	}

	public async remove(user: User, planId: string) {
		const plan = await this.prismaService.sponsorshipPlan.findUnique({
			where: {
				id: planId,
				channelId: user.id
			}
		});

		if (!plan) {
			throw new NotFoundException('Plan is not found');
		}

		await this.archiveInStripe(plan.stripeProductId, plan.stripePlanId);

		await this.prismaService.sponsorshipPlan.delete({
			where: {
				id: plan.id
			}
		});

		return true;
	}

	private async archiveInStripe(productId: string, priceId?: string) {
		if (priceId) {
			try {
				await this.stripeService.prices.update(priceId, { active: false });
			} catch {
				// nothing left to do about it here
			}
		}

		try {
			await this.stripeService.products.update(productId, { active: false });
		} catch {
			// nothing left to do about it here
		}
	}

	private get currency(): string {
		return requireEnv(this.configService, 'STRIPE_CURRENCY').toLowerCase();
	}
}
