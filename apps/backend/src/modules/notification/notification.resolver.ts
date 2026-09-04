import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';

import { ChangeNotificationSettingsInput } from '@/src/modules/notification/inputs/change-notification-settings.input';
import { ChangeNotificationSettingsResponse } from '@/src/modules/notification/models/notification-settings.model';
import { NotificationModel } from '@/src/modules/notification/models/notification.model';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { NotificationService } from './notification.service';

@Resolver(() => NotificationModel)
export class NotificationResolver {
	public constructor(
		private readonly notificationService: NotificationService
	) {}

	@Authorization()
	@Query(() => Int, { name: 'findUnreadNotificationsCount' })
	public async findUnreadCount(@Authorized() user: User) {
		return this.notificationService.findUnreadCount(user);
	}

	@Authorization()
	@Query(() => [NotificationModel], { name: 'findNotificationsByUser' })
	public async findByUser(@Authorized() user: User) {
		return this.notificationService.findByUser(user);
	}

	@Authorization()
	@Mutation(() => ChangeNotificationSettingsResponse, {
		name: 'changeNotificationsSettings'
	})
	public async changeSettings(
		@Authorized() user: User,
		@Args('data') input: ChangeNotificationSettingsInput
	) {
		return this.notificationService.changeSettings(user, input);
	}
}
