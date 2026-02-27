import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface ReferralStats {
  totalReferrals: number;
  validatedReferrals: number;
  pendingReferrals: number;
  penaltyCreditsEarned: number;
  referralCode: string;
  referralLink: string;
}

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async getReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refCode: true },
    });
    if (user?.refCode) return user.refCode;

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await this.prisma.user.update({
      where: { id: userId },
      data: { refCode: code },
    });
    return code;
  }

  async getReferralLink(userId: string): Promise<string> {
    const code = await this.getReferralCode(userId);
    const baseUrl = process.env.APP_DEEP_LINK ?? 'yourapp://';
    return `${baseUrl}register?ref=${code}`;
  }

  async applyReferralOnSignup(
    newUserId: string,
    refCode: string,
  ): Promise<void> {
    if (!refCode) return;

    const referrer = await this.prisma.user.findUnique({
      where: { refCode: refCode.toUpperCase() },
    });
    if (!referrer || referrer.id === newUserId) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        status: 'PENDING',
        rewardType: 'PENALTY_CREDIT',
        rewardValue: 1,
        expiresAt,
      },
    });
  }

  async usePenaltyCredit(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { penaltyCredits: true },
    });
    if (!user || user.penaltyCredits < 1) return false;

    await this.prisma.user.update({
      where: { id: userId },
      data: { penaltyCredits: { decrement: 1 } },
    });
    return true;
  }

  async getMyReferrals(userId: string) {
    return this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: {
          select: { id: true, fullname: true, createdAt: true },
        },
      },
    });
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const code = await this.getReferralCode(userId);
    const link = await this.getReferralLink(userId);

    const [referrals, user] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId: userId },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { penaltyCredits: true },
      }),
    ]);

    return {
      totalReferrals: referrals.length,
      validatedReferrals: referrals.filter((r) => r.status === 'VALIDATED')
        .length,
      pendingReferrals: referrals.filter((r) => r.status === 'PENDING').length,
      penaltyCreditsEarned: user?.penaltyCredits ?? 0,
      referralCode: code,
      referralLink: link,
    };
  }
}
