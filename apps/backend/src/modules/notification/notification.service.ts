import { Injectable } from '@nestjs/common';
import {
	NotificationType,
	type SponsorshipPlan,
	TokenType,
	type User
} from '@prisma/generated/client';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { ChangeNotificationSettingsInput } from '@/src/modules/notification/inputs/change-notification-settings.input';
import { escapeHtml } from '@/src/shared/utils/escape-html.util';
import { generateToken } from '@/src/shared/utils/generate-token.util';

const NOTIFICATIONS_LIMIT = 50;

@Injectable()
export class NotificationService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findUnreadCount(user: User) {
		return this.prismaService.notification.count({
			where: {
				userId: user.id,
				isRead: false
			}
		});
	}

	public async findByUser(user: User) {
		const notifications = await this.prismaService.notification.findMany({
			where: {
				userId: user.id
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: NOTIFICATIONS_LIMIT
		});

		const unreadIds = notifications
			.filter(notification => !notification.isRead)
			.map(notification => notification.id);

		if (unreadIds.length) {
			await this.prismaService.notification.updateMany({
				where: {
					id: {
						in: unreadIds
					}
				},
				data: {
					isRead: true
				}
			});
		}

		return notifications;
	}

	public async createStreamStart(userId: string, channel: User) {
		return this.prismaService.notification.create({
			data: {
				message: `<b class='font-medium'>Do not miss it!</b>
				<p>Join the stream on the channel <a href='/${escapeHtml(channel.username)}' class='font-semibold'>${escapeHtml(channel.displayName)}</a>.</p>`,
				type: NotificationType.STREAM_START,
				user: {
					connect: {
						id: userId
					}
				}
			}
		});
	}

	public async createNewFollowing(userId: string, follower: User) {
		return this.prismaService.notification.create({
			data: {
				message: `<b class='font-medium'>You have a new follower!</b>
				<p>This is the user <a href='/${escapeHtml(follower.username)}' class='font-semibold'>${escapeHtml(follower.displayName)}</a>.</p>`,
				type: NotificationType.NEW_FOLLOWER,
				user: {
					connect: {
						id: userId
					}
				}
			}
		});
	}

	public async createNewSponsorship(
		userId: string,
		plan: SponsorshipPlan,
		sponsor: User
	) {
		return this.prismaService.notification.create({
			data: {
				message: `<b class='font-medium'>You have a new sponsor!</b>
				<p>The user <a href='/${escapeHtml(sponsor.username)}' class='font-semibold'>${escapeHtml(sponsor.displayName)}</a> became your sponsor with the plan <strong>${escapeHtml(plan.title)}</strong>.</p>`,
				type: NotificationType.NEW_SPONSORSHIP,
				user: {
					connect: {
						id: userId
					}
				}
			}
		});
	}

	public async createEnableTwoFactor(userId: string) {
		return this.prismaService.notification.create({
			data: {
				message: `<b class='font-medium'>Secure your account!</b>
				<p>Enable two-factor authentication in your account settings to raise your level of protection.</p>`,
				type: NotificationType.ENABLE_TWO_FACTOR,
				user: {
					connect: {
						id: userId
					}
				}
			}
		});
	}

	public async createVerifyChannel(userId: string) {
		return this.prismaService.notification.create({
			data: {
				message: `<b class='font-medium'>Congratulations!</b>
				<p>Your channel is verified, and a checkmark now appears next to it.</p>`,
				type: NotificationType.VERIFIED_CHANNEL,
				user: {
					connect: {
						id: userId
					}
				}
			}
		});
	}

	public async changeSettings(
		user: User,
		input: ChangeNotificationSettingsInput
	) {
		const { siteNotifications, telegramNotifications } = input;

		const notificationSettings =
			await this.prismaService.notificationSettings.upsert({
				where: {
					userId: user.id
				},
				create: {
					siteNotifications,
					telegramNotifications,
					user: {
						connect: {
							id: user.id
						}
					}
				},
				update: {
					siteNotifications,
					telegramNotifications
				},
				include: {
					user: true
				}
			});

		if (
			notificationSettings.telegramNotifications &&
			!notificationSettings.user.telegramId
		) {
			const telegramAuthToken = await generateToken(
				this.prismaService,
				user,
				TokenType.TELEGRAM_AUTH
			);

			return {
				notificationSettings,
				telegramAuthToken: telegramAuthToken.token
			};
		}

		if (
			!notificationSettings.telegramNotifications &&
			notificationSettings.user.telegramId
		) {
			notificationSettings.user = await this.prismaService.user.update({
				where: {
					id: user.id
				},
				data: {
					telegramId: null
				}
			});
		}

		return { notificationSettings };
	}
}
