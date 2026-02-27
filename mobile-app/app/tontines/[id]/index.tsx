import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Share,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../src/theme';
import { tontinesApi } from '../../../src/api/tontines.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { useWalletStore } from '../../../src/store/wallet.store';
import { PButton } from '../../../src/components/ui/PButton';
import { PCard } from '../../../src/components/ui/PCard';
import { PBadge } from '../../../src/components/ui/PBadge';
import { ErrorMessage } from '../../../src/components/ui/ErrorMessage';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { getTontineAction } from '../../../src/utils/tontine-actions';
import QRCode from 'react-native-qrcode-svg';

const FREQ_LABELS: Record<string, string> = {
  JOURNALIER: 'Journalier',
  HEBDOMADAIRE: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  ACTIVE: 'Active',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

function getInitials(user: { fullName?: string; fullname?: string }): string {
  const name = user?.fullName ?? (user as { fullname?: string })?.fullname ?? '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TontineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const [tontine, setTontine] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [invitationLink, setInvitationLink] = useState('');
  const [pendingCotisation, setPendingCotisation] = useState<{
    montant: number;
    penalite?: number;
    memberId: string;
  } | null>(null);

  const fetchTontine = async () => {
    if (!id) return;
    try {
      const [data, cotisation] = await Promise.all([
        tontinesApi.getDetail(id),
        tontinesApi.getPendingCotisation(id).catch(() => null),
      ]);
      setTontine(data);
      setPendingCotisation(cotisation);
      setError('');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTontine();
  }, [id]);

  useEffect(() => {
    if (id && tontine?.status === 'ACTIVE') {
      useWalletStore.getState().refreshBalance().catch(() => {});
    }
  }, [id, tontine?.status]);

  const handleJoin = async () => {
    if (!id || !tontine) return;
    const token = (tontine.invitationToken as string) ?? '';
    if (!token) return;
    setError('');
    setSubmitting(true);
    try {
      await tontinesApi.join(token);
      await fetchTontine();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    setError('');
    try {
      const link = await tontinesApi.getInvitationLink(id);
      if (__DEV__) {
        setInvitationLink(link);
        setShowQR(true);
      } else {
        await Share.share({
          message: `Rejoins ma tontine "${tontine?.titre ?? ''}" ! ${link}`,
          url: link,
        });
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur partage');
    }
  };

  const handlePayCotisation = () => {
    const walletBalance = useWalletStore.getState().balance;
    const montantBase = Number(tontine?.montant ?? 0);
    const penalite = pendingCotisation?.penalite ?? 0;
    const montantDu = montantBase + penalite;

    Alert.alert(
      '💰 Payer ma cotisation',
      `Montant dû : ${montantDu} XOF\n` +
        (penalite > 0 ? `(dont ${penalite} XOF de pénalité)\n` : '') +
        `\nVotre wallet : ${walletBalance} XOF`,
      [
        { text: '❌ Annuler', style: 'cancel' },
        {
          text: '💳 Payer par Wallet',
          onPress: () => payByWallet(montantDu),
          style: walletBalance >= montantDu ? 'default' : 'destructive',
        },
        {
          text: '📱 Mobile Money',
          onPress: () => payByMobileMoney(),
        },
      ],
    );
  };

  const payByWallet = async (montant: number) => {
    const walletBalance = useWalletStore.getState().balance;

    if (walletBalance < montant) {
      Alert.alert(
        '❌ Solde insuffisant',
        `Solde wallet : ${walletBalance} XOF\n` +
          `Montant requis : ${montant} XOF\n\n` +
          'Rechargez votre wallet ou payez par Mobile Money.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Recharger le wallet',
            onPress: () => router.push('/wallet' as never),
          },
        ],
      );
      return;
    }

    if (!id) return;
    try {
      setIsPaying(true);
      setError('');
      await tontinesApi.payCotisationWallet(id);
      await useWalletStore.getState().refreshBalance();
      Alert.alert('✅ Paiement réussi', `${montant} XOF débités de votre wallet.`);
      await fetchTontine();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Paiement échoué';
      Alert.alert('❌ Erreur', msg);
    } finally {
      setIsPaying(false);
    }
  };

  const payByMobileMoney = () => {
    router.push({
      pathname: '/payments/mobile-money' as never,
      params: {
        tontineId: id,
        tontineTitle: String(tontine?.titre ?? ''),
        amount: String(Number(tontine?.montant ?? 0) + (pendingCotisation?.penalite ?? 0)),
      },
    });
  };

  if (loading && !tontine) return <LoadingScreen />;
  if (!tontine) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backBtn}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Tontine</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Tontine introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const members = (tontine.members as { id: string; userId: string; tourOrder?: number; user: { fullname?: string } }[]) ?? [];
  const memberCount = members.length;
  const nombreMembres = (tontine.nombreMembres as number) ?? memberCount;
  const userRole = tontine.userRole as 'CREATOR' | 'MEMBER' | null;
  const sortedMembers = [...members].sort((a, b) => (a.tourOrder ?? 0) - (b.tourOrder ?? 0));
  const currentCycle = (tontine.currentCycle as number) ?? 1;
  const currentTurnIndex = Math.max(0, currentCycle - 1);

  const action = getTontineAction(
    {
      id: id ?? '',
      status: String(tontine.status ?? ''),
      creatorId: String(tontine.creatorId ?? ''),
      invitationActive: tontine.invitationActive as boolean | undefined,
    },
    userId ?? '',
    userRole
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {String(tontine.titre ?? '')}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTontine();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.badgeRow}>
          <PBadge
            label={STATUS_LABELS[String(tontine.status)] ?? String(tontine.status)}
            variant={
              tontine.status === 'ACTIVE'
                ? 'success'
                : tontine.status === 'COMPLETED'
                  ? 'default'
                  : tontine.status === 'PENDING'
                    ? 'info'
                    : 'default'
            }
          />
        </View>

        <PCard padding="lg" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Cotisation</Text>
          <Text style={styles.summaryAmount}>
            {Number(tontine.montant ?? 0).toLocaleString()} XOF /{' '}
            {FREQ_LABELS[String(tontine.frequence)] ?? String(tontine.frequence)}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              Membres : {memberCount}/{nombreMembres}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${nombreMembres > 0 ? (memberCount / nombreMembres) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              Tour actuel : {currentCycle}/{nombreMembres}
            </Text>
          </View>
        </PCard>

        <Text style={styles.sectionTitle}>Timeline des tours</Text>
        <PCard padding="md">
          {sortedMembers.map((m, idx) => {
            const isCurrent = idx === currentTurnIndex;
            const isPast = idx < currentTurnIndex;
            const isFuture = idx > currentTurnIndex;
            return (
              <View key={m.id} style={styles.timelineRow}>
                <View
                  style={[
                    styles.avatar,
                    isCurrent && styles.avatarCurrent,
                    isPast && styles.avatarPast,
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(m.user)}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineName}>
                    {(m.user as { fullname?: string })?.fullname ?? 'Membre'}
                  </Text>
                  <Text style={styles.timelineTurn}>
                    Tour {idx + 1}
                    {isCurrent && ' 👑'}
                    {isPast && ' ✅'}
                    {isFuture && ' ○'}
                  </Text>
                </View>
              </View>
            );
          })}
        </PCard>

        <Text style={styles.sectionTitle}>Membres</Text>
        <PCard padding="md">
          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(m.user)}</Text>
              </View>
              <Text style={styles.memberName}>
                {(m.user as { fullname?: string })?.fullname ?? 'Membre'}
              </Text>
            </View>
          ))}
        </PCard>

        <ErrorMessage message={error} />

        {action === 'JOIN' && (
          <PButton
            label="✅ Rejoindre"
            onPress={handleJoin}
            loading={submitting}
            fullWidth
            style={styles.actionBtn}
          />
        )}
        {action === 'SHARE' && (
          <>
            <PButton
              label="🔗 Partager / Inviter"
              onPress={handleShare}
              variant="secondary"
              fullWidth
              style={styles.actionBtn}
            />
            {__DEV__ && (
              <Modal visible={showQR} transparent animationType="fade">
                <View style={styles.qrModal}>
                  <PCard padding="lg" shadow="lg">
                    <Text style={styles.qrTitle}>📱 Scanner pour rejoindre</Text>
                    <QRCode value={invitationLink} size={200} color="#0F172A" />
                    <Text style={styles.qrLink} selectable>
                      {invitationLink}
                    </Text>
                    <PButton
                      label="Fermer"
                      onPress={() => setShowQR(false)}
                      variant="outline"
                      size="sm"
                      fullWidth
                    />
                  </PCard>
                </View>
              </Modal>
            )}
          </>
        )}
        {action === 'PAY' && (
          <PButton
            label="💳 Payer ma cotisation"
            onPress={handlePayCotisation}
            loading={isPaying}
            disabled={isPaying}
            fullWidth
            style={styles.actionBtn}
          />
        )}

        {(tontine.status === 'ACTIVE' || tontine.status === 'COMPLETED') && (
          <PButton
            label="Voir l'historique"
            onPress={() => router.push(`/tontines/${id}/history` as never)}
            variant="outline"
            fullWidth
            style={styles.actionBtn}
          />
        )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.danger, fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 48 },
  badgeRow: { marginBottom: theme.spacing.md },
  summaryCard: { marginBottom: theme.spacing.xl },
  summaryLabel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  summaryRow: { marginBottom: 4 },
  summaryText: { fontSize: theme.typography.size.base, color: theme.colors.gray700 },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.gray300,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarCurrent: {
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarPast: { backgroundColor: theme.colors.successLight },
  avatarText: { fontSize: 12, fontWeight: '600', color: theme.colors.gray700 },
  timelineContent: { flex: 1 },
  timelineName: {
    fontSize: theme.typography.size.base,
    fontWeight: '600',
    color: theme.colors.black,
  },
  timelineTurn: { fontSize: theme.typography.size.sm, color: theme.colors.gray500 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberName: { flex: 1, fontSize: theme.typography.size.base, color: theme.colors.black },
  actionBtn: { marginTop: theme.spacing.lg },
  qrModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  qrTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  qrLink: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray700,
    marginVertical: theme.spacing.md,
    textAlign: 'center',
  },
});
