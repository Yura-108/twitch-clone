import {Field, ObjectType, ID, Int} from "@nestjs/graphql";

@ObjectType()
export class SocialLinkModel {
	@Field(() => ID)
	public id: string;

	@Field(() => String)
	public title: string;

	@Field(() => String)
	public url: string;

	@Field(() => Int)
	public position: number;

	@Field(() => String)
	public userId: string;

	@Field(() => Date)
	public createdAt: Date;

	@Field(() => Date)
	public updatedAt: Date;
}
