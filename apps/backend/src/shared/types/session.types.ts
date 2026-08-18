import type { SessionData } from 'express-session';

// What connect-redis actually stores: the session serialised to JSON, so the
// Cookie class instance is gone. The sid lives in the Redis key, not the value.
export type StoredSession = Omit<SessionData, 'cookie'>;
