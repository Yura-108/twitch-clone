import { Inject } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';
import { PubSub } from 'graphql-subscriptions';

import { PUB_SUB } from '@/src/core/pubsub/pubsub.constants';
import { ChangeChatSettingsInput } from '@/src/modules/chat/inputs/change-chat-settings.input';
import { SendMessageInput } from '@/src/modules/chat/inputs/send-message.input';
import { ChatMessageModel } from '@/src/modules/chat/models/chat-message.model';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { ChatService } from './chat.service';

const CHAT_MESSAGE_ADDED = 'CHAT_MESSAGE_ADDED';

@Resolver(() => ChatMessageModel)
export class ChatResolver {
	public constructor(
		private readonly chatService: ChatService,
		@Inject(PUB_SUB) private readonly pubSub: PubSub
	) {}

	@Query(() => [ChatMessageModel], { name: 'findChatMessagesByStream' })
	public async findByStream(@Args('streamId') streamId: string) {
		return this.chatService.findByStream(streamId);
	}

	@Authorization()
	@Mutation(() => ChatMessageModel, { name: 'sendMessage' })
	public async sendMessage(
		@Authorized() user: User,
		@Args('data') input: SendMessageInput
	) {
		const message = await this.chatService.sendMessage(user, input);

		await this.pubSub.publish(CHAT_MESSAGE_ADDED, {
			chatMessageAdded: message
		});

		return message;
	}

	@Subscription(() => ChatMessageModel, {
		name: 'chatMessageAdded',
		filter: (payload, variables) =>
			payload.chatMessageAdded.streamId === variables.streamId
	})
	public chatMessageAdded(@Args('streamId') streamId: string) {
		return this.pubSub.asyncIterableIterator(CHAT_MESSAGE_ADDED);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'changeChatSettings' })
	public async changeSettings(
		@Authorized() user: User,
		@Args('data') input: ChangeChatSettingsInput
	) {
		return this.chatService.changeSettings(user, input);
	}
}
