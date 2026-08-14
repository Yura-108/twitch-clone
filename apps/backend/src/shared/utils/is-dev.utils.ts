import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// IS_DEV_ENV below is evaluated at import time, which in CommonJS happens
// before main.ts's body runs — so this module has to load the root .env
// itself rather than relying on the call in main.ts.
dotenv.config({ path: '../../.env' });

export function isDev(configService: ConfigService) {
	return configService.getOrThrow<string>('NODE_ENV') === 'development';
}

export const IS_DEV_ENV = process.env.NODE_ENV === 'development';
