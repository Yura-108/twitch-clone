import { Field, ID, ObjectType } from '@nestjs/graphql';

import { SocialLinkModel } from '@/src/modules/auth/profile/models/social-link.model';
import { StreamModel } from '@/src/modules/stream/models/stream.model';

@ObjectType({})
export class UserModel {
	@Field(() => ID)
	public id: string;

	@Field(() => String)
	public email: string;

	public password: string;

	@Field(() => String)
	public username: string;

	@Field(() => String)
	public displayName: string;

	@Field(() => String, { nullable: true })
	public avatar: string;

	@Field(() => String, { nullable: true })
	public bio: string;

	@Field(() => String, { nullable: true })
	public telegramId: string;

	@Field(() => Boolean)
	public isVerified: boolean;

	@Field(() => Boolean)
	public isEmailVerified: boolean;

	@Field(() => Boolean)
	public isTotpEnabled: boolean;

	public totpSecret: string | null;

	@Field(() => Boolean)
	public isDeactivated: boolean;

	@Field(() => Date, { nullable: true })
	public deactivatedAt: Date | null;

	@Field(() => [SocialLinkModel])
	public socialLinks: SocialLinkModel[];

	@Field(() => StreamModel, { nullable: true })
	public stream: StreamModel | null;

	@Field(() => Date)
	public createdAt: Date;

	@Field(() => Date)
	public updatedAt: Date;
}
