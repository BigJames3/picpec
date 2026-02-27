import api from './client';

export interface ReferralStats {
  totalReferrals: number;
  validatedReferrals: number;
  pendingReferrals: number;
  penaltyCreditsEarned: number;
  referralCode: string;
  referralLink: string;
}

export interface ReferralItem {
  id: string;
  status: string;
  rewardValue: number;
  createdAt: string;
  referred: { id: string; fullname: string; createdAt: string };
}

export const referralsApi = {
  getMyReferrals: () =>
    api.get<{ success: boolean; data: ReferralItem[] }>('/referrals/my-referrals'),
  getMyReferral: () =>
    api.get<{ success: boolean; data: ReferralStats }>('/referrals/my-referral'),
  getLink: () =>
    api.get<{ success: boolean; data: { link: string } }>('/referrals/link'),
};
