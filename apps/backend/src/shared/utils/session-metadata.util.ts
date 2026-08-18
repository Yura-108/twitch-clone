import DeviceDetector from 'device-detector-js';
import type { Request } from 'express';
import { lookup } from 'geoip-lite';
import * as countries from 'i18n-iso-countries';

import { SessionMetadata } from '@/src/shared/types/session-metadata.types';
import { IS_DEV_ENV } from '@/src/shared/utils/is-dev.utils';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const DEV_IP = '173.166.164.121';

const UNKNOWN_IP = '0.0.0.0';

const UNKNOWN = 'Unknown';

function firstHeaderValue(
	value: string | string[] | undefined
): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

// Two independent sources of undefined: geoip may not resolve the IP at all,
// and getName() returns undefined for codes it does not know.
function getCountryName(code: string | undefined): string {
	return (code && countries.getName(code, 'en')) || UNKNOWN;
}

export function getClientIp(req: Request): string {
	if (IS_DEV_ENV) return DEV_IP;

	// 1. Cloudflare puts the original client address here.
	const cloudflareIp = firstHeaderValue(
		req.headers['cf-connecting-ip']
	)?.trim();
	if (cloudflareIp) return cloudflareIp;

	// 2. Proxy chain "client, proxy1, proxy2" — the client is the leftmost entry.
	const forwardedFor = firstHeaderValue(req.headers['x-forwarded-for']);
	const clientFromChain = forwardedFor?.split(',')[0]?.trim();
	if (clientFromChain) return clientFromChain;

	// 3. The only place undefined used to leak from: req.ip is derived from
	//    req.socket.remoteAddress, which is gone once the socket is destroyed.
	return req.ip ?? req.socket.remoteAddress ?? UNKNOWN_IP;
}

export function getSessionMetadata(
	req: Request,
	userAgent: string
): SessionMetadata {
	const ip = getClientIp(req);

	const device = new DeviceDetector().parse(userAgent);

	const location = lookup(ip);

	const [latitude, longitude] = location?.ll ?? [0, 0];

	return {
		location: {
			country: getCountryName(location?.country),
			city: location?.city || UNKNOWN,
			latitude,
			longitude
		},
		device: {
			browser: device.client?.name || '',
			os: device.os?.name || '',
			type: device.device?.type || ''
		},
		ip
	};
}
