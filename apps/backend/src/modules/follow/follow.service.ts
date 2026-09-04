import {
	ConflictException,
	Injectable,
	NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/generated/client';
import type { User } from '@prisma/generated/client';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { NotificationService } from '@/src/modules/notification/notification.service';

@Injectable()
export class FollowService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly notificationService: NotificationService
	) {}

	public async findMyFollowers(user: User) {
		return this.prismaService.follow.findMany({
			where: {
				followingId: user.id
			},
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				follower: true
			}
		});
	}

	public async findMyFollowing(user: User) {
		return this.prismaService.follow.findMany({
			where: {
				followerId: user.id
			},
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				following: true
			}
		});
	}

	public async follow(user: User, channelId: string) {
		if (channelId === user.id) {
			throw new ConflictException('You cannot follow yourself.');
		}

		const channel = await this.prismaService.user.findUnique({
			where: {
				id: channelId,
				isDeactivated: false
			},
			include: {
				notificationsSettings: true
			}
		});

		if (!channel) {
			throw new NotFoundException('Channel not found.');
		}

		try {
			await this.prismaService.follow.create({
				data: {
					followerId: user.id,
					followingId: channel.id
				}
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				throw new ConflictException('You already follow this channel.');
			}

			throw error;
		}

		// Settings are created lazily, so a channel without a row keeps the
		// schema default of site notifications being on.
		if (channel.notificationsSettings?.siteNotifications ?? true) {
			await this.notificationService.createNewFollowing(channel.id, user);
		}

		return true;
	}

	public async unfollow(user: User, channelId: string) {
		const { count } = await this.prismaService.follow.deleteMany({
			where: {
				followerId: user.id,
				followingId: channelId
			}
		});

		if (!count) {
			throw new ConflictException('You do not follow this channel.');
		}

		return true;
	}
}
