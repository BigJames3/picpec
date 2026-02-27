import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReferralService } from './referral.service';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReferralsController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralsModule {}
