import { Injectable } from '@nestjs/common';
import {PrismaService} from "@/src/core/prisma/prisma.service";
import {MailService} from "@/src/modules/libs/mail/mail.service";
import {Cron, CronExpression} from "@nestjs/schedule";

@Injectable()
export class CronService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly mailService: MailService
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	public async deleteDeactivatedAccounts() {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const deactivatedAccounts = await this.prismaService.user.findMany({
			where: {
				isDeactivated: true,
				deactivatedAt: {
					lte: sevenDaysAgo,
				}
			}
		});

		for (const user of deactivatedAccounts) {
			await this.mailService.sendAccountDeletion(user.email);
		}

		await this.prismaService.user.deleteMany({
			where: {
				isDeactivated: true,
				deactivatedAt: {
					lte: sevenDaysAgo,
				}
			}
		});

		console.log('deleted accounts');
	}
}
