import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

import { StorageService } from '@/src/modules/libs/storage/storage.service';

// Scripts run with cwd = apps/backend (yarn workspaces), so the single
// source-of-truth .env at the monorepo root is two levels up.
expand(config({ path: '../../.env' }));

// Built by hand rather than through NestFactory: booting the whole app would
// also require Postgres and Redis to be up, which has nothing to do with
// whether the S3 credentials work.
async function main() {
	const storage = new StorageService(new ConfigService());
	const key = `.healthcheck/${Date.now()}.txt`;

	await storage.ping();
	console.log('✓ bucket reachable');

	const url = storage.getPublicUrl(key);

	await storage.upload(Buffer.from('ok'), key, 'text/plain');
	console.log(`✓ upload    ${url}`);

	// Uploading proves the credentials; it says nothing about whether a browser
	// can read the object back. That needs the bucket to be marked Public, and
	// getPublicUrl() is useless until it is.
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`Public URL returned ${response.status} ${response.statusText}. ` +
				`Mark the "${process.env.S3_BUCKET}" bucket as Public in the Supabase dashboard.`
		);
	}

	console.log('✓ public read');

	await storage.remove(key);
	console.log('✓ delete');
}

main().catch((error: unknown) => {
	console.error('\n✗ storage check failed\n');
	console.error(error);
	process.exit(1);
});
