import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class SendMessageInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	public text: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	public streamId: string;
}
