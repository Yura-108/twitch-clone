import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import {
	generateRecoveryCodes,
	normalizeRecoveryCode
} from '@/src/shared/utils/recovery-code.util';

@Injectable()
export class RecoveryCodeService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async issue(userId: string): Promise<string[]> {
		const codes = generateRecoveryCodes();

		const hashed = await Promise.all(codes.map(code => hash(code)));

		await this.prismaService.$transaction([
			this.prismaService.recoveryCode.deleteMany({ where: { userId } }),
			this.prismaService.recoveryCode.createMany({
				data: hashed.map(code => ({ code, userId }))
			})
		]);

		return codes;
	}

	public async consume(userId: string, input: string): Promise<boolean> {
		const candidate = normalizeRecoveryCode(input);

		if (!candidate) {
			return false;
		}

		const stored = await this.prismaService.recoveryCode.findMany({
			where: { userId }
		});

		for (const recoveryCode of stored) {
			if (!(await verify(recoveryCode.code, candidate))) {
				continue;
			}

			// deleteMany, not delete: two requests racing on the same code both
			// pass verify, and the loser would otherwise crash on a missing row
			// instead of simply finding nothing to spend.
			const { count } = await this.prismaService.recoveryCode.deleteMany({
				where: { id: recoveryCode.id }
			});

			return count > 0;
		}

		return false;
	}

	public async revokeAll(userId: string): Promise<void> {
		await this.prismaService.recoveryCode.deleteMany({ where: { userId } });
	}
}
