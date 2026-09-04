import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/generated/client';
import { hash } from 'argon2';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync } from 'fs';
import { join } from 'path';
import 'reflect-metadata';
import sharp from 'sharp';

import { CATEGORIES } from '@/src/core/prisma/data/categories.data';
import { STREAMS } from '@/src/core/prisma/data/streams.data';
import { USERNAMES } from '@/src/core/prisma/data/users.data';
import { StorageService } from '@/src/modules/libs/storage/storage.service';

expand(config({ path: '../../.env' }));

interface Size {
	width: number;
	height: number;
}

const CATEGORY_ART: Size = { width: 285, height: 380 };
const AVATAR_ART: Size = { width: 512, height: 512 };
const THUMBNAIL_ART: Size = { width: 1280, height: 720 };

const PASSWORD = '12345678';

const STREAM_TITLES: Record<string, string[]> = STREAMS;

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.POSTGRES_URI }),
	transactionOptions: {
		maxWait: 5000,
		timeout: 10000
	}
});

const storage = new StorageService(new ConfigService());

async function uploadArt(source: string, key: string, size: Size) {
	const buffer = await sharp(source)
		.resize(size.width, size.height, { fit: 'cover' })
		.webp({ quality: 90 })
		.toBuffer();

	return storage.upload(buffer, key, 'image/webp');
}

function randomOf<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

async function main() {
	Logger.log('Начало заполнения базы данных');

	const missingCategoryArt = CATEGORIES.filter(
		category =>
			!existsSync(join('media', 'categories', `${category.slug}.webp`))
	).map(category => category.slug);

	if (missingCategoryArt.length) {
		throw new Error(
			`Отсутствуют обложки категорий: ${missingCategoryArt.join(', ')}`
		);
	}

	await prisma.$transaction([
		prisma.stream.deleteMany(),
		prisma.socialLink.deleteMany(),
		prisma.user.deleteMany(),
		prisma.category.deleteMany()
	]);

	Logger.log('База данных очищена');

	for (const category of CATEGORIES) {
		const thumbnailUrl = await uploadArt(
			join('media', 'categories', `${category.slug}.webp`),
			`categories/${category.slug}.webp`,
			CATEGORY_ART
		);

		await prisma.category.create({
			data: {
				title: category.title,
				slug: category.slug,
				description: category.description,
				thumbnailUrl
			}
		});
	}

	Logger.log(`Категории успешно созданы: ${CATEGORIES.length}`);

	const categories = await prisma.category.findMany();

	const password = await hash(PASSWORD);

	const missingAvatars: string[] = [];
	const missingThumbnails: string[] = [];

	for (const username of USERNAMES) {
		const category = randomOf(categories);
		const title = randomOf(STREAM_TITLES[category.slug]);

		const avatarSource = join('media', 'channels', `${username}.webp`);
		const thumbnailSource = join('media', 'streams', `${username}.webp`);

		let avatar: string | null = null;
		let thumbnailUrl: string | null = null;

		if (existsSync(avatarSource)) {
			avatar = await uploadArt(
				avatarSource,
				`channels/${username}/avatar-${Date.now()}.webp`,
				AVATAR_ART
			);
		} else {
			missingAvatars.push(username);
		}

		if (existsSync(thumbnailSource)) {
			thumbnailUrl = await uploadArt(
				thumbnailSource,
				`streams/${username}/thumbnail-${Date.now()}.webp`,
				THUMBNAIL_ART
			);
		} else {
			missingThumbnails.push(username);
		}

		await prisma.user.create({
			data: {
				email: `${username}@teastream.ru`,
				password,
				username,
				displayName: username,
				avatar,
				isEmailVerified: true,
				socialLinks: {
					createMany: {
						data: [
							{
								title: 'Telegram',
								url: `https://t.me/${username}`,
								position: 1
							},
							{
								title: 'YouTube',
								url: `https://youtube.com/@${username}`,
								position: 2
							}
						]
					}
				},
				notificationsSettings: {
					create: {}
				},
				stream: {
					create: {
						title,
						thumbnailUrl,
						category: {
							connect: {
								id: category.id
							}
						}
					}
				}
			}
		});

		Logger.log(`Пользователь "${username}" и его стрим успешно созданы`);
	}

	if (missingAvatars.length) {
		Logger.warn(
			`Нет аватаров (${missingAvatars.length}): ${missingAvatars.join(', ')}`
		);
	}

	if (missingThumbnails.length) {
		Logger.warn(
			`Нет превью стримов (${missingThumbnails.length}): ${missingThumbnails.join(', ')}`
		);
	}

	Logger.log('Заполнение базы данных завершено успешно');
}

main()
	.catch((error: unknown) => {
		Logger.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
