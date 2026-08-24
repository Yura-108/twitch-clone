import { Field, InputType } from '@nestjs/graphql';
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
	MinLength
} from 'class-validator';

@InputType()
export class DeactivateAccountInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	public email: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	public password: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@Length(6, 6)
	public pin?: string;
}
