import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';
import { GraphQLUpload } from 'graphql-upload-ts';

import { ChangeStreamInfoInput } from '@/src/modules/stream/inputs/change-stream-info.input';
import { FiltersInput } from '@/src/modules/stream/inputs/filters.input';
import { StreamModel } from '@/src/modules/stream/models/stream.model';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';
import { ParseUploadPipe } from '@/src/shared/pipes/parse-upload.pipe';
import type { UploadedImage } from '@/src/shared/types/upload.types';

import { StreamService } from './stream.service';

@Resolver('Stream')
export class StreamResolver {
	public constructor(private readonly streamService: StreamService) {}

	@Query(() => [StreamModel], { name: 'findAllStreams' })
	public async findAll(
		@Args('filters', { nullable: true }) filters?: FiltersInput
	) {
		return await this.streamService.findAll(filters);
	}

	@Query(() => [StreamModel], { name: 'findRandomStreams' })
	public async findRandom() {
		return await this.streamService.findRandom();
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'changeStreamInfo' })
	public async changeInfo(
		@Authorized() user: User,
		@Args('data') input: ChangeStreamInfoInput
	) {
		return this.streamService.changeInfo(user, input);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'changeStreamThumbnail' })
	public async changeThumbnail(
		@Authorized() user: User,
		@Args(
			'thumbnail',
			{ type: () => GraphQLUpload },
			new ParseUploadPipe({
				maxSize: 10 * 1024 * 1024,
				formats: ['jpeg', 'png', 'webp', 'gif', 'heif']
			})
		)
		thumbnail: UploadedImage
	) {
		return this.streamService.changeThumbnail(user, thumbnail);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'removeStreamThumbnail' })
	public async removeThumbnail(@Authorized() user: User) {
		return this.streamService.removeThumbnail(user);
	}
}
