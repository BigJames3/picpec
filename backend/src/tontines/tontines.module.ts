import { Module } from '@nestjs/common';
import { TontinesController } from './tontines.controller';
import { TontinesService } from './tontines.service';
import { TontinesScheduler } from './tontines.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TontinesController],
  providers: [TontinesService, TontinesScheduler],
  exports: [TontinesService, TontinesScheduler],
})
export class TontinesModule {}
