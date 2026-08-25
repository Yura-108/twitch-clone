import {BadRequestException, ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {StorageService} from "@/src/modules/libs/storage/storage.service";
import {PrismaService} from "@/src/core/prisma/prisma.service";
import {Prisma} from "@prisma/generated/client";
import type {User} from "@prisma/generated/client";
import type { FileUpload } from 'graphql-upload-ts';
import convert from 'heic-convert';
import sharp from 'sharp';
import {ChangeProfileInfoInput} from "@/src/modules/auth/profile/inputs/change-profile-info.input";
import {SocialLinkInput, SocialLinkOrderInput} from "@/src/modules/auth/profile/inputs/social-link.input";

@Injectable()
export class ProfileService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly storageService: StorageService
	) {}

	public async changeAvatar(user: User, file: Promise<FileUpload>) {
		const { createReadStream } = await file;

		const maxSize = 10 * 1024 * 1024;
		const stream = createReadStream();
		const chunks: Buffer[] = [];
		let size = 0;

		for await (const chunk of stream) {
			size += (chunk as Buffer).length;

			if (size > maxSize) {
				stream.destroy();

				throw new BadRequestException('The image must be under 10 MB.');
			}

			chunks.push(chunk as Buffer);
		}

		let source = Buffer.concat(chunks);
		let metadata: sharp.Metadata;

		try {
			metadata = await sharp(source).metadata();
		} catch {
			throw new BadRequestException('The file is not a valid image.');
		}

		const { format, compression } = metadata;
		const allowedFormats = ['jpeg', 'png', 'webp', 'gif', 'heif', 'avif'];

		if (!format || !allowedFormats.includes(format)) {
			throw new BadRequestException(
				'Unsupported image format. Use JPEG, PNG, WebP, GIF or HEIC.'
			);
		}

		let avatar: Buffer;

		try {
			if (format === 'heif' && compression === 'hevc') {
				source = Buffer.from(
					await convert({ buffer: source, format: 'JPEG', quality: 1 })
				);
			}

			avatar = await sharp(source, {
				animated: format === 'gif' || format === 'webp'
			})
				.rotate()
				.resize(512, 512, { fit: 'cover' })
				.webp({ quality: 90 })
				.toBuffer();
		} catch {
			throw new BadRequestException('The image could not be processed.');
		}

		const key = `channels/${user.username}/avatar-${Date.now()}.webp`;
		const previousAvatar = user.avatar;

		await this.storageService.upload(avatar, key, 'image/webp');

		await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: {
				avatar: key
			}
		});

		if (previousAvatar) {
			await this.storageService.remove(previousAvatar);
		}

		return true;
	}

	public async removeAvatar(user: User) {
		if (!user.avatar) {
			return true;
		}

		await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: {
				avatar: null
			}
		});

		await this.storageService.remove(user.avatar);

		return true;
	}

	public async changeInfo(user: User, input: ChangeProfileInfoInput) {
		const { username, displayName, bio } = input;

		const usernameExists = await this.prismaService.user.findUnique({
			where: {
				username
			}
		});

		if (usernameExists && usernameExists.id !== user.id) {
			throw new ConflictException('This username is already in use.');
		}

		try {
			await this.prismaService.user.update({
				where: {
					id: user.id
				},
				data: {
					username,
					displayName,
					bio
				}
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				throw new ConflictException('This username is already in use.');
			}

			throw error;
		}

		return true;
	}

	public async findSocialLinks(user: User) {
		return await this.prismaService.socialLink.findMany({
			where: {
				userId: user.id
			},
			orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
		});
	}

	public async createSocialLink(user: User, input: SocialLinkInput) {
		const { url, title } = input;

		await this.prismaService.$transaction(async tx => {
			const lastSocialLink = await tx.socialLink.findFirst({
				where: {
					userId: user.id
				},
				orderBy: {
					position: 'desc'
				}
			});

			await tx.socialLink.create({
				data: {
					title,
					url,
					position: lastSocialLink ? lastSocialLink.position + 1 : 1,
					user: {
						connect: {
							id: user.id
						}
					}
				}
			});
		});

		return true;
	}

	public async reorderSocialLinks(user: User, list: SocialLinkOrderInput[]) {
		if (!list.length) {
			return true;
		}

		const ids = [...new Set(list.map(socialLink => socialLink.id))];

		const ownedCount = await this.prismaService.socialLink.count({
			where: {
				id: { in: ids },
				userId: user.id
			}
		});

		if (ownedCount !== ids.length) {
			throw new NotFoundException('Some of the social links were not found.');
		}

		await this.prismaService.$transaction(
			list.map(socialLink =>
				this.prismaService.socialLink.updateMany({
					where: {
						id: socialLink.id,
						userId: user.id
					},
					data: {
						position: socialLink.position
					}
				})
			)
		);

		return true;
	}

	public async updateSocialLink(
		user: User,
		id: string,
		input: SocialLinkInput
	) {
		const { title, url } = input;

		const { count } = await this.prismaService.socialLink.updateMany({
			where: {
				id,
				userId: user.id
			},
			data: {
				title,
				url
			}
		});

		if (!count) {
			throw new NotFoundException('Social link not found.');
		}

		return true;
	}

	public async removeSocialLink(user: User, id: string) {
		const { count } = await this.prismaService.socialLink.deleteMany({
			where: {
				id,
				userId: user.id
			}
		});

		if (!count) {
			throw new NotFoundException('Social link not found.');
		}

		return true;
	}
}
