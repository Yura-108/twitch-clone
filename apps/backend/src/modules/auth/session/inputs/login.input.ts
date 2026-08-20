import { Field, InputType } from '@nestjs/graphql';
import {IsNotEmpty, IsString, Length} from 'class-validator';

@InputType()
export class LoginInput {
	@Field()
	@IsString()
	@IsNotEmpty()
	login: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	password: string;

	@Field(() => String, {nullable: true})
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	public pin : string;
}
