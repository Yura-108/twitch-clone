import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, User } from '@prisma/generated/client';
import sharp from 'sharp';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { StorageService } from '@/src/modules/libs/storage/storage.service';
import { ChangeStreamInfoInput } from '@/src/modules/stream/inputs/change-stream-info.input';
import { FiltersInput } from '@/src/modules/stream/inputs/filters.input';
import type { UploadedImage } from '@/src/shared/types/upload.types';
import { pickRandom } from '@/src/shared/utils/pick-random.util';

@Injectable()
export class StreamService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService,
		private readonly storageService: StorageService
	) {}

	public async findAll(input: FiltersInput = {}) {
		const { take, skip, searchTerm } = input;

		const where: Prisma.StreamWhereInput = {
			AND: [
				this.findLiveFilter(),
				...(searchTerm ? [this.findBySearchTermFilter(searchTerm)] : [])
			]
		};

		return this.prismaService.stream.findMany({
			take: Math.min(take ?? 12, 50),
			skip: skip ?? 0,
			where,
			include: {
				user: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		});
	}

	public async findRandom() {
		const ids = await this.prismaService.stream.findMany({
			where: this.findLiveFilter(),
			select: { id: true }
		});

		const picked = pickRandom(ids, 4);

		if (!picked.length) {
			return [];
		}

		return this.prismaService.stream.findMany({
			where: {
				id: {
					in: picked.map(stream => stream.id)
				}
			},
			include: {
				user: true
			}
		});
	}

	public async changeInfo(user: User, input: ChangeStreamInfoInput) {
		const { title, categoryId } = input;

		const stream = await this.prismaService.stream.update({
			where: {
				userId: user.id
			},
			data: {
				title,
				category: {
					connect: {
						id: categoryId
					}
				}
			}
		});

		if (!stream) {
			throw new NotFoundException('Stream not found.');
		}

		return true;
	}

	public async changeThumbnail(user: User, image: UploadedImage) {
		const stream = await this.findByUserId(user);

		if (!stream) {
			throw new NotFoundException('Stream not found.');
		}

		let thumbnail: Buffer;

		try {
			thumbnail = await sharp(image.buffer, { animated: image.animated })
				.rotate()
				.resize(1280, 720, { fit: 'cover' })
				.webp({ quality: 90 })
				.toBuffer();
		} catch {
			throw new BadRequestException('The image could not be processed.');
		}

		const key = `streams/${user.username}/thumbnail-${Date.now()}.webp`;
		const previousThumbnail = stream.thumbnailUrl;

		await this.storageService.upload(thumbnail, key, 'image/webp');

		await this.prismaService.stream.update({
			where: {
				userId: user.id
			},
			data: {
				thumbnailUrl: key
			}
		});

		if (previousThumbnail) {
			await this.storageService.remove(previousThumbnail);
		}

		return true;
	}

	public async removeThumbnail(user: User) {
		const stream = await this.findByUserId(user);

		if (!stream) {
			throw new NotFoundException('Stream not found.');
		}

		if (!stream.thumbnailUrl) {
			return true;
		}

		await this.prismaService.stream.update({
			where: { userId: user.id },
			data: { thumbnailUrl: null }
		});

		await this.storageService.remove(stream.thumbnailUrl);

		return true;
	}

	public async findByUserId(user: User) {
		return this.prismaService.stream.findUnique({
			where: {
				userId: user.id
			}
		});
	}

	private findLiveFilter(): Prisma.StreamWhereInput {
		return {
			isLive: true,
			user: {
				isDeactivated: false
			}
		};
	}

	private findBySearchTermFilter(searchTerm: string): Prisma.StreamWhereInput {
		return {
			OR: [
				{
					title: {
						contains: searchTerm,
						mode: 'insensitive'
					}
				},
				{
					user: {
						username: {
							contains: searchTerm,
							mode: 'insensitive'
						}
					}
				}
			]
		};
	}
}
