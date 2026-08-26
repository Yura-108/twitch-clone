import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import sharp from 'sharp';
import {PrismaService} from "@/src/core/prisma/prisma.service";
import {StorageService} from "@/src/modules/libs/storage/storage.service";
import {FiltersInput} from "@/src/modules/stream/inputs/filters.input";
import type {Prisma, User} from "@prisma/generated/client";
import {ChangeStreamInfoInput} from "@/src/modules/stream/inputs/change-stream-info.input";
import type {UploadedImage} from "@/src/shared/types/upload.types";

@Injectable()
export class StreamService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService,
		private readonly storageService: StorageService
	) {}

	public async findAll(input: FiltersInput = {})  {
		const { take, skip, searchTerm } =  input;

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
				user: true,
			},
			orderBy: {
				createdAt: 'desc'
			}
		});
	}

	public async findRandom() {
		const where = this.findLiveFilter();

		const total = await this.prismaService.stream.count({ where });
		const amount = Math.min(4, total);

		if (!amount) {
			return [];
		}

		const offsets = new Set<number>();

		while (offsets.size < amount) {
			offsets.add(Math.floor(Math.random() * total));
		}

		const streams = await Promise.all(
			Array.from(offsets).map(skip =>
				this.prismaService.stream.findFirst({
					where,
					include: {
						user: true,
					},
					orderBy: {
						id: 'asc'
					},
					skip
				})
			)
		);

		return streams.filter(stream => stream !== null);
	}

	public async changeInfo(user: User, input: ChangeStreamInfoInput) {
		const { title } = input;

		const { count } = await this.prismaService.stream.updateMany({
			where: {
				userId: user.id
			},
			data: {
				title,
			}
		});

		if (!count) {
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
				.resize(1280, 720, {fit: 'cover'})
				.webp({quality: 90})
				.toBuffer();
		} catch {
			throw new BadRequestException('The image could not be processed.');
		}

		const key = `streams/${user.username}/thumbnail-${Date.now()}.webp`;
		const  previousThumbnail = stream.thumbnailUrl;

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
			return true
		}

		await this.prismaService.stream.update({
			where: {userId: user.id},
			data: {thumbnailUrl: null}
		});

		await this.storageService.remove(stream.thumbnailUrl);

		return true
	}

	public async findByUserId(user: User) {
		return this.prismaService.stream.findUnique({
			where: {
				userId: user.id
			}
		})
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
		}
	}
}
