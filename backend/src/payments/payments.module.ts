import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TontinesModule } from '../tontines/tontines.module';
import { PaymentService } from './payment.service';
import { WebhookHandler } from './webhook.handler';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, TontinesModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentService, WebhookHandler],
  exports: [PaymentService],
})
export class PaymentsModule {}
