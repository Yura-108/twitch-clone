import { Field, InputType } from '@nestjs/graphql';
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	Matches,
	MinLength
} from 'class-validator';

@InputType()
export class ChangePasswordInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	public oldPassword: string;

	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	public newPassword: string;
}
