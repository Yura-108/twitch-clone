import { Module } from '@nestjs/common';

import { NotificationModule } from '@/src/modules/notification/notification.module';

import { FollowResolver } from './follow.resolver';
import { FollowService } from './follow.service';

@Module({
	imports: [NotificationModule],
	providers: [FollowResolver, FollowService]
})
export class FollowModule {}
