import {
	BadRequestException,
	ConflictException,
	Injectable
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/generated/client';
import { encode } from 'hi-base32';
import { randomBytes } from 'node:crypto';
import * as QRCode from 'qrcode';

import { getEncryptionKey } from '@/src/core/config/encryption.config';
import { PrismaService } from '@/src/core/prisma/prisma.service';
import { RedisService } from '@/src/core/redis/redis.service';
import { DisableTotpInput } from '@/src/modules/auth/totp/inputs/disable-totp.input';
import { EnableTotpInput } from '@/src/modules/auth/totp/inputs/enable-totp.input';
import { RecoveryCodeService } from '@/src/modules/auth/totp/recovery-code.service';
import { decrypt, encrypt } from '@/src/shared/utils/encryption.util';
import { createTotp, verifyTotpPin } from '@/src/shared/utils/totp.util';

const PENDING_PREFIX = 'totp:pending:';
const PENDING_TTL_SECONDS = 300;

@Injectable()
export class TotpService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly redisService: RedisService,
		private readonly recoveryCodeService: RecoveryCodeService
	) {}

	public async generate(user: User) {
		if (user.isTotpEnabled) {
			throw new ConflictException(
				'Two-factor authentication is already enabled.'
			);
		}

		const secret = encode(randomBytes(15)).replace(/=/g, '').substring(0, 24);

		const otpauthUrl = createTotp(user.email, secret).toString();
		const qrcodeUrl = await QRCode.toDataURL(otpauthUrl);

		// The server has to own the secret it just issued: without this the
		// enable step would trust whatever the client sends back, and anyone
		// with a stolen session could bind a second factor of their own.
		await this.redisService.set(
			this.pendingKey(user.id),
			encrypt(secret, getEncryptionKey(this.configService)),
			'EX',
			PENDING_TTL_SECONDS
		);

		return { qrcodeUrl, secret };
	}

	public async enable(user: User, input: EnableTotpInput) {
		const { pin } = input;

		if (user.isTotpEnabled) {
			throw new ConflictException(
				'Two-factor authentication is already enabled.'
			);
		}

		const key = this.pendingKey(user.id);
		const storedSecret = await this.redisService.get(key);

		if (!storedSecret) {
			throw new BadRequestException(
				'The code has expired. Please generate a new QR code.'
			);
		}

		const secret = decrypt(storedSecret, getEncryptionKey(this.configService));

		if (!verifyTotpPin(user.email, secret, pin)) {
			throw new BadRequestException('Code is not valid');
		}

		await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: {
				isTotpEnabled: true,
				totpSecret: storedSecret
			}
		});

		await this.redisService.del(key);

		return this.recoveryCodeService.issue(user.id);
	}

	public async disable(user: User, input: DisableTotpInput) {
		const { pin, recoveryCode } = input;

		if (!user.isTotpEnabled || !user.totpSecret) {
			throw new BadRequestException(
				'Two-factor authentication is not enabled.'
			);
		}

		if (!pin && !recoveryCode) {
			throw new BadRequestException(
				'A verification code or a recovery code is required.'
			);
		}

		if (pin) {
			const secret = decrypt(
				user.totpSecret,
				getEncryptionKey(this.configService)
			);

			if (!verifyTotpPin(user.email, secret, pin)) {
				throw new BadRequestException('Code is not valid');
			}
		} else if (recoveryCode) {
			const consumed = await this.recoveryCodeService.consume(
				user.id,
				recoveryCode
			);

			if (!consumed) {
				throw new BadRequestException('Recovery code is not valid');
			}
		}

		await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: {
				isTotpEnabled: false,
				totpSecret: null
			}
		});

		// The remaining codes only ever authorised this second factor.
		await this.recoveryCodeService.revokeAll(user.id);

		return true;
	}

	private pendingKey(userId: string): string {
		return `${PENDING_PREFIX}${userId}`;
	}
}
