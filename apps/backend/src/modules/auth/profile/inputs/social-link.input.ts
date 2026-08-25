import {Field, InputType, Int} from "@nestjs/graphql";
import {IsInt, IsNotEmpty, IsString, IsUrl, MaxLength, Min} from "class-validator";

@InputType()
export class SocialLinkInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MaxLength(50)
	public title: string;

	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@IsUrl({ protocols: ['http', 'https'], require_protocol: true })
	public url: string;
}

@InputType()
export class SocialLinkOrderInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	public id: string;

	@Field(() => Int)
	@IsInt()
	@Min(1)
	public position: number;
}
