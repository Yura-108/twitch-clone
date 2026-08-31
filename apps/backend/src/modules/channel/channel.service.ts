import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/src/core/prisma/prisma.service';

@Injectable()
export class ChannelService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findRecommended() {
		return this.prismaService.user.findMany({
			where: {
				isDeactivated: false
			},
			orderBy: {
				followers: {
					_count: 'desc'
				}
			},
			include: {
				stream: true
			},
			take: 7
		});
	}

	public async findByUsername(username: string) {
		const channel = await this.prismaService.user.findUnique({
			where: {
				username,
				isDeactivated: false
			},
			include: {
				socialLinks: {
					orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
				},
				stream: {
					include: {
						category: true
					}
				}
			}
		});

		if (!channel) {
			throw new NotFoundException('Channel not found.');
		}

		return channel;
	}

	public async findFollowersCountByChannel(channelId: string) {
		return this.prismaService.follow.count({
			where: {
				followingId: channelId
			}
		});
	}
}
