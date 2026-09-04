import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { LivekitService } from '@/src/modules/libs/livekit/livekit.service';
import { NotificationService } from '@/src/modules/notification/notification.service';

@Injectable()
export class WebhookService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService,
		private readonly livekitService: LivekitService,
		private readonly notificationService: NotificationService
	) {}

	public async receiveWebhookLivekit(body: string, authorization: string) {
		const event = await this.livekitService.receiver.receive(
			body,
			authorization,
			true
		);

		if (event.event === 'ingress_started' && event.ingressInfo) {
			const stream = await this.prismaService.stream.update({
				where: {
					ingressId: event.ingressInfo.ingressId
				},
				data: {
					isLive: true
				},
				include: {
					user: true
				}
			});

			const followers = await this.prismaService.follow.findMany({
				where: {
					followingId: stream.user.id,
					follower: {
						isDeactivated: false
					}
				},
				include: {
					follower: {
						include: {
							notificationsSettings: true
						}
					}
				}
			});

			for (const follow of followers) {
				const follower = follow.follower;

				// Settings are created lazily, so a follower without a row keeps
				// the schema default of site notifications being on.
				if (follower.notificationsSettings?.siteNotifications ?? true) {
					await this.notificationService.createStreamStart(
						follower.id,
						stream.user
					);
				}
			}
		}

		if (event.event === 'ingress_ended' && event.ingressInfo) {
			await this.prismaService.stream.update({
				where: {
					ingressId: event.ingressInfo.ingressId
				},
				data: {
					isLive: false
				}
			});
		}
	}
}
