import {Field, InputType} from "@nestjs/graphql";
import {IsNotEmpty, IsString, MaxLength} from "class-validator";

@InputType()
export class ChangeStreamInfoInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	public title: string
}
