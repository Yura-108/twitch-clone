import 'reflect-metadata';

import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';
import sharp from 'sharp';

import { PrismaClient } from '@prisma/generated/client';
import { StorageService } from '@/src/modules/libs/storage/storage.service';

// Scripts run with cwd = apps/backend (yarn workspaces), so the single
// source-of-truth .env at the monorepo root is two levels up.
expand(config({ path: '../../.env' }));

interface CategorySeed {
	title: string;
	slug: string;
	description: string;
}

// `slug` doubles as the artwork file name in media/categories.
const categories: CategorySeed[] = [
	{
		title: 'Just Chatting',
		slug: 'just-chatting',
		description:
			'No gameplay, just conversation — reactions, storytelling and answering whatever chat throws at you.'
	},
	{
		title: 'Counter-Strike',
		slug: 'counter-strike',
		description:
			'Tactical five-on-five shooter. Ranked grinds, pug nights and pro match co-streams.'
	},
	{
		title: 'Dota 2',
		slug: 'dota-2',
		description:
			'Five-on-five MOBA with a very long hero pool and an even longer learning curve.'
	},
	{
		title: 'Minecraft',
		slug: 'minecraft',
		description:
			'Survival worlds, redstone contraptions, modpacks and builds that take a hundred hours.'
	},
	{
		title: 'Grand Theft Auto V',
		slug: 'grand-theft-auto-v',
		description:
			'Roleplay servers, heists and the occasional attempt to obey traffic laws.'
	},
	{
		title: 'Fortnite',
		slug: 'fortnite',
		description:
			'Battle royale with building, limited-time modes and a cosmetics problem.'
	},
	{
		title: 'Cyberpunk 2077',
		slug: 'cyberpunk-2077',
		description:
			'Night City playthroughs, build experiments and photo mode detours.'
	},
	{
		title: 'Music',
		slug: 'music',
		description:
			'Live sets, production sessions and instruments played to an audience of strangers.'
	},
	{
		title: 'Programming',
		slug: 'programming',
		description:
			'Building things live — shipping features, fixing bugs and losing arguments with the type checker.'
	},
	{
		title: 'Sport',
		slug: 'sport',
		description:
			'Watch-alongs, training sessions and arguing about referees in real time.'
	}
];

// The artwork in media/categories is inconsistent: some files are JPEG or PNG
// despite the .webp name, and sizes run from 285x380 up to 2766x3688. Everything
// is re-encoded so the bucket holds one predictable format at box-art size.
const boxArt = { width: 285, height: 380 };

async function main() {
	const storage = new StorageService(new ConfigService());
	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString: process.env.POSTGRES_URI })
	});

	try {
		for (const category of categories) {
			const source = join('media', 'categories', `${category.slug}.webp`);
			const key = `categories/${category.slug}.webp`;

			const thumbnail = await sharp(source)
				.resize(boxArt.width, boxArt.height, { fit: 'cover' })
				.webp({ quality: 90 })
				.toBuffer();

			await storage.upload(thumbnail, key, 'image/webp');

			// Keyed on slug so the script can be re-run after a reset without
			// duplicating rows or leaving stale descriptions behind.
			await prisma.category.upsert({
				where: { slug: category.slug },
				update: {
					title: category.title,
					description: category.description,
					thumbnailUrl: key
				},
				create: {
					title: category.title,
					slug: category.slug,
					description: category.description,
					thumbnailUrl: key
				}
			});

			console.log(
				`✓ ${category.title.padEnd(20)} ${(thumbnail.length / 1024).toFixed(1).padStart(6)} KB  ${key}`
			);
		}

		const total = await prisma.category.count();

		console.log(`\n${categories.length} categories seeded, ${total} in total.`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error('\n✗ seeding failed\n');
	console.error(error);
	process.exit(1);
});
