import {Field, InputType} from "@nestjs/graphql";
import {Transform} from "class-transformer";
import {IsNotEmpty, IsOptional, IsString, Matches, MaxLength} from "class-validator";

@InputType()
export class ChangeProfileInfoInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MaxLength(25)
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
	@Transform(({ value }) =>
		typeof value === 'string' ? value.toLowerCase() : value
	)
	public username: string;

	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MaxLength(50)
	public displayName: string;

	@Field(() => String, { nullable: true })
	@IsString()
	@IsOptional()
	@MaxLength(300)
	public bio?: string;
}
