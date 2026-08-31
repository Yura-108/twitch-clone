import { Field, InputType } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
	MaxLength
} from 'class-validator';

// Exactly one of the two is required; which one is enforced in the service,
// because class-validator cannot express "either" without a custom constraint.
@InputType()
export class DisableTotpInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	public pin?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(32)
	public recoveryCode?: string;
}
