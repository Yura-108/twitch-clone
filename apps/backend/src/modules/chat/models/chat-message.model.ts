import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { ChatMessage } from '@prisma/generated/client';

import { UserModel } from '@/src/modules/auth/account/models/user.model';
import { StreamModel } from '@/src/modules/stream/models/stream.model';

@ObjectType()
export class ChatMessageModel implements ChatMessage {
	@Field(() => ID)
	public id: string;

	@Field(() => String)
	public text: string;

	@Field(() => UserModel, { nullable: true })
	public user: UserModel;

	@Field(() => String)
	public userId: string;

	@Field(() => StreamModel, { nullable: true })
	public stream: StreamModel;

	@Field(() => String)
	public streamId: string;

	@Field(() => Date)
	public createdAt: Date;

	@Field(() => Date)
	public updatedAt: Date;
}
