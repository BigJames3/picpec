import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Share,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../src/theme';
import { useReferral } from '../../src/hooks/useReferral';
import { PButton } from '../../src/components/ui/PButton';
import { PCard } from '../../src/components/ui/PCard';
import { PBadge } from '../../src/components/ui/PBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';

export default function ReferralsScreen() {
  const { stats, referrals, loading, shareReferralLink, refetch } = useReferral();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCopyCode = async () => {
    const refCode = stats?.referralCode ?? '';
    if (!refCode) return;
    await Clipboard.setStringAsync(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const refCode = stats?.referralCode ?? '';
    if (!refCode) return;
    try {
      await Share.share({
        message: `Rejoins PICPEC avec mon code ${refCode} et bénéficie d'avantages exclusifs !`,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  const referralsList = referrals.map((r) => ({
    id: r.id,
    fullName: r.referred?.fullname ?? '—',
    createdAt: r.createdAt,
    status: r.status === 'VALIDATED' ? ('ACTIVE' as const) : ('PENDING' as const),
  }));
  const refCode = stats?.referralCode ?? '—';

  if (loading && !stats) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Parrainage
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <PCard padding="lg" shadow="sm" style={styles.card}>
          <Text style={styles.cardEmoji}>🎁</Text>
          <Text style={styles.cardTitle}>Votre code</Text>
          <Text style={styles.refCode}>{refCode}</Text>
          <PButton
            variant="outline"
            label={copied ? '✅ Copié !' : '📋 Copier le code'}
            onPress={handleCopyCode}
            fullWidth
            style={styles.copyBtn}
          />
        </PCard>

        <PCard padding="lg" shadow="sm" style={styles.card}>
          <Text style={styles.cardTitle}>Mes statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>
                {stats?.totalReferrals ?? 0}
              </Text>
              <Text style={styles.statLabel}>Filleuls</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statValue, styles.statValueSuccess]}>
                {(stats?.penaltyCreditsEarned ?? 0).toLocaleString()} FCFA
              </Text>
              <Text style={styles.statLabel}>Gains</Text>
            </View>
          </View>
        </PCard>

        <PButton
          label="🔗 Partager mon code"
          onPress={handleShare}
          fullWidth
          style={styles.shareBtn}
        />

        <Text style={styles.sectionTitle}>Mes filleuls</Text>
        <FlatList
          data={referralsList}
          keyExtractor={(r) => r.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <PCard padding="md" shadow="sm" style={styles.referralCard}>
              <View style={styles.referralRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{item.fullName}</Text>
                  <Text style={styles.referralDate}>
                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <PBadge
                  variant={item.status === 'ACTIVE' ? 'success' : 'warning'}
                  label={item.status === 'ACTIVE' ? 'Actif' : 'En attente'}
                />
              </View>
            </PCard>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🤝"
              title="Aucun filleul"
              subtitle="Partagez votre code pour inviter des amis"
            />
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  backBtn: { fontSize: 24, color: theme.colors.primary },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
    color: theme.colors.black,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 48 },
  card: { marginBottom: theme.spacing.lg },
  cardEmoji: { fontSize: 24, marginBottom: theme.spacing.sm },
  cardTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  refCode: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 4,
    marginBottom: theme.spacing.md,
  },
  copyBtn: { marginTop: theme.spacing.sm },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.black,
  },
  statValueSuccess: { color: theme.colors.success },
  statLabel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginTop: theme.spacing.xs,
  },
  shareBtn: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  referralCard: { marginBottom: theme.spacing.md },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.size.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  referralInfo: { flex: 1 },
  referralName: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
  },
  referralDate: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginTop: 2,
  },
});
