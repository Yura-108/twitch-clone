import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

// Scripts run with cwd = apps/backend (yarn workspaces), so the single
// source-of-truth .env at the monorepo root is two levels up.
expand(config({ path: '../../.env' }));

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations'
	},
	datasource: {
		url: env('POSTGRES_URI')
	}
});
