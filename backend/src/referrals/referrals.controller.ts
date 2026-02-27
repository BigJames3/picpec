import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/auth.types';
import { ReferralService } from './referral.service';

@ApiTags('referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('my-referrals')
  @ApiOperation({ summary: 'Liste des filleuls du parrain' })
  async getMyReferrals(@CurrentUser() user: CurrentUserData) {
    const referrals = await this.referralService.getMyReferrals(user.id);
    return { success: true, data: referrals };
  }

  @Get('my-referral')
  @ApiOperation({ summary: 'Récupérer son code et stats de parrainage' })
  async getMyReferral(@CurrentUser() user: CurrentUserData) {
    const stats = await this.referralService.getReferralStats(user.id);
    return { success: true, data: stats };
  }

  @Get('link')
  @ApiOperation({ summary: 'Générer ou récupérer son lien de parrainage' })
  async getLink(@CurrentUser() user: CurrentUserData) {
    const link = await this.referralService.getReferralLink(user.id);
    return { success: true, data: { link } };
  }
}
