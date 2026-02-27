import { useState, useEffect, useCallback } from 'react';
import { Share } from 'react-native';
import { referralsApi, ReferralStats, ReferralItem } from '../api/referrals.api';

export function useReferral() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, referralsRes] = await Promise.all([
        referralsApi.getMyReferral(),
        referralsApi.getMyReferrals(),
      ]);
      setStats(statsRes.data.data);
      setReferrals(referralsRes.data.data ?? []);
    } catch (err) {
      console.error('Erreur chargement parrainage', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const shareReferralLink = async () => {
    if (!stats?.referralLink) return;
    await Share.share({
      message: `🤝 Rejoins-moi sur PICPEC ! Utilise mon lien pour t'inscrire : ${stats.referralLink}`,
      url: stats.referralLink,
    });
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, referrals, loading, shareReferralLink, refetch: fetchStats };
}
