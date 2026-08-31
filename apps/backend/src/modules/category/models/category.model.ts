import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { Category } from '@prisma/generated/client';

import { StreamModel } from '@/src/modules/stream/models/stream.model';

@ObjectType()
export class CategoryModel implements Category {
	@Field(() => ID)
	public id: string;

	@Field(() => String)
	public title: string;

	@Field(() => String)
	public slug: string;

	@Field(() => String, { nullable: true })
	public description: string | null;

	@Field(() => String)
	public thumbnailUrl: string;

	@Field(() => [StreamModel])
	public streams: StreamModel[];

	@Field(() => Date)
	public createdAt: Date;

	@Field(() => Date)
	public updatedAt: Date;
}
