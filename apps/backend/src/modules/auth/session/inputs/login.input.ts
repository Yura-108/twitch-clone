import { Field, InputType } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
	MaxLength
} from 'class-validator';

@InputType()
export class LoginInput {
	@Field()
	@IsString()
	@IsNotEmpty()
	public login: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	public password: string;

	// Only sent when the account has TOTP enabled. Without @IsOptional() the
	// remaining validators run against undefined and reject every normal login.
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	public pin?: string;

	// The way back in after losing the authenticator: without this the account
	// is sealed, because disabling TOTP itself requires being signed in.
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(32)
	public recoveryCode?: string;
}
