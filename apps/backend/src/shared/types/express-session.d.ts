import 'express-session';

import type { SessionMetadata } from '@/src/shared/types/session-metadata.types';

declare module 'express-session' {
	interface SessionData {
		userId?: string;
		// ISO string on both write and read: the session round-trips through
		// JSON in Redis, so a Date would never survive as a Date anyway.
		createdAt?: string;
		metadata?: SessionMetadata;
	}
}
