import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({})
export class UserModel {
	@Field(() => ID)
	id: string;

	@Field(() => String)
	email: string;

	password: string;

	@Field(() => String)
	username: string;

	@Field(() => String)
	displayName: string;

	@Field(() => String, { nullable: true })
	avatar: string;

	@Field(() => String, { nullable: true })
	bio: string;

	@Field(() => Boolean)
	isVerified: boolean;

	@Field(() => Boolean)
	isEmailVerified: boolean;

	@Field(() => Boolean)
	isTotpEnabled: boolean;

	@Field(() => String, { nullable: true })
	totpSecret: string;

	@Field(() => Boolean)
	isDeactivated: boolean;

	@Field(() => Date, { nullable: true })
	deactivatedAt: Date | null;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
