import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common';
import type { Stream, User } from '@prisma/generated/client';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { ChangeChatSettingsInput } from '@/src/modules/chat/inputs/change-chat-settings.input';
import { SendMessageInput } from '@/src/modules/chat/inputs/send-message.input';

const MESSAGES_LIMIT = 50;

@Injectable()
export class ChatService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findByStream(streamId: string) {
		const messages = await this.prismaService.chatMessage.findMany({
			where: {
				streamId
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: MESSAGES_LIMIT,
			include: {
				user: true
			}
		});

		return messages.reverse();
	}

	public async sendMessage(user: User, input: SendMessageInput) {
		const { text, streamId } = input;

		const stream = await this.prismaService.stream.findUnique({
			where: {
				id: streamId
			}
		});

		if (!stream) {
			throw new NotFoundException('Stream not found');
		}

		if (!stream.isLive) {
			throw new BadRequestException('Stream is not in live');
		}

		await this.ensureCanWrite(user, stream);

		return this.prismaService.chatMessage.create({
			data: {
				text,
				user: {
					connect: {
						id: user.id
					}
				},
				stream: {
					connect: {
						id: streamId
					}
				}
			},
			include: {
				stream: true,
				user: true
			}
		});
	}

	public async changeSettings(user: User, input: ChangeChatSettingsInput) {
		const { isChatEnabled, isChatFollowersOnly, isChatPremiumFollowersOnly } =
			input;

		const stream = await this.prismaService.stream.findUnique({
			where: {
				userId: user.id
			}
		});

		if (!stream) {
			throw new NotFoundException('Stream not found');
		}

		await this.prismaService.stream.update({
			where: {
				userId: user.id
			},
			data: {
				isChatEnabled,
				isChatFollowersOnly,
				isChatPremiumFollowersOnly
			}
		});

		return true;
	}

	private async ensureCanWrite(user: User, stream: Stream) {
		if (stream.userId === user.id) {
			return;
		}

		if (!stream.isChatEnabled) {
			throw new ForbiddenException('Chat is disabled for this stream');
		}

		if (stream.isChatPremiumFollowersOnly) {
			const sponsorship =
				await this.prismaService.sponsorshipSubscription.findFirst({
					where: {
						userId: user.id,
						channelId: stream.userId,
						expiresAt: {
							gt: new Date()
						}
					}
				});

			if (!sponsorship) {
				throw new ForbiddenException(
					'Chat is available to sponsors of this channel only'
				);
			}

			return;
		}

		if (stream.isChatFollowersOnly) {
			const follow = await this.prismaService.follow.findUnique({
				where: {
					followerId_followingId: {
						followerId: user.id,
						followingId: stream.userId
					}
				}
			});

			if (!follow) {
				throw new ForbiddenException(
					'Chat is available to followers of this channel only'
				);
			}
		}
	}
}
