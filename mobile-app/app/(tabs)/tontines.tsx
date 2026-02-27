import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Share,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tontinesApi } from '../../src/api/tontines.api';
import { useAuthStore } from '../../src/store/auth.store';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { PButton } from '../../src/components/ui/PButton';
import { getTontineAction } from '../../src/utils/tontine-actions';
import { theme } from '../../src/theme';

const TABS = ['Actives', 'En attente', 'Historique'];

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

export default function TontinesScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const userId = useAuthStore((s) => s.user?.id);
  const [activeTab, setActiveTab] = useState(0);
  const [activeList, setActiveList] = useState<unknown[]>([]);
  const [pendingList, setPendingList] = useState<unknown[]>([]);
  const [historyList, setHistoryList] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [active, pending, history] = await Promise.all([
        tontinesApi.getActive(),
        tontinesApi.getPending(),
        tontinesApi.getHistory(),
      ]);
      setActiveList(Array.isArray(active) ? active : []);
      setPendingList(Array.isArray(pending) ? pending : []);
      setHistoryList(Array.isArray(history) ? history : []);
      setError('');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    fetchAll();
  }, [isHydrated, accessToken, fetchAll]);

  const currentList: Record<string, unknown>[] =
    activeTab === 0 ? (activeList as Record<string, unknown>[]) : activeTab === 1 ? (pendingList as Record<string, unknown>[]) : (historyList as Record<string, unknown>[]);

  const handleJoin = async (token: string | undefined) => {
    if (!token) return;
    setError('');
    try {
      await tontinesApi.join(token);
      await fetchAll();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur');
    }
  };

  const handleShare = async (t: { id: string; titre: string }) => {
    setError('');
    try {
      const link = await tontinesApi.getInvitationLink(t.id);
      await Share.share({
        message: `Rejoins ma tontine "${t.titre}" ! ${link}`,
        url: link,
      });
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur partage');
    }
  };

  const handlePay = (t: { id: string; titre: string; montant: number }) => {
    router.push({
      pathname: '/payments/mobile-money' as never,
      params: {
        tontineId: t.id,
        tontineTitle: t.titre,
        amount: String(t.montant),
      },
    });
  };

  const renderItem = ({ item: t }: { item: Record<string, unknown> }) => {
    const tontine = t.tontine ?? t;
    const id = (tontine as { id?: string }).id ?? (t as { id?: string }).id;
    const titre = (tontine as { titre?: string }).titre ?? (t as { titre?: string }).titre ?? '';
    const montant = (tontine as { montant?: number }).montant ?? (t as { montant?: number }).montant ?? 0;
    const status = (tontine as { status?: string }).status ?? (t as { status?: string }).status ?? '';
    const creatorId = (tontine as { creatorId?: string }).creatorId ?? (t as { creatorId?: string }).creatorId ?? '';
    const invitationActive = (tontine as { invitationActive?: boolean }).invitationActive ?? true;
    const userRole = (t as { userRole?: string }).userRole ?? (t as { role?: string }).role ?? null;
    const members = (tontine as { members?: unknown[] }).members ?? [];
    const memberCount = Array.isArray(members) ? members.length : 0;
    const nombreMembres = (tontine as { nombreMembres?: number }).nombreMembres ?? (t as { nombreMembres?: number }).nombreMembres ?? 0;
    const frequence = (tontine as { frequence?: string }).frequence ?? (t as { frequence?: string }).frequence ?? '';

    const action = getTontineAction(
      { id: String(id ?? ''), status: String(status ?? ''), creatorId: String(creatorId ?? ''), invitationActive },
      userId ?? '',
      userRole as 'CREATOR' | 'MEMBER' | null
    );

    return (
      <Pressable onPress={() => router.push(`/tontines/${id}` as never)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{titre}</Text>
          </View>
          <Text style={styles.cardDesc}>
            {montant.toLocaleString()} FCFA • {FREQ_LABELS[frequence as string] ?? frequence} •{' '}
            {memberCount}/{nombreMembres || '?'} membres
          </Text>
          <Text style={styles.cardStatus}>{STATUS_LABELS[status] ?? status}</Text>
          <View style={styles.actions}>
            {action === 'JOIN' && (
              <PButton
                label="✅ Rejoindre"
                onPress={() => handleJoin((tontine as { invitationToken?: string }).invitationToken)}
                variant="primary"
                size="sm"
              />
            )}
            {action === 'SHARE' && (
              <PButton
                label="🔗 Partager / Inviter"
                onPress={() => handleShare({ id: id ?? '', titre })}
                variant="secondary"
                size="sm"
              />
            )}
            {action === 'PAY' && (
              <PButton
                label="💳 Payer ma cotisation"
                onPress={() => handlePay({ id: id ?? '', titre, montant })}
                variant="primary"
                size="sm"
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tontines</Text>
        <View style={styles.tabRow}>
          {TABS.map((tab, i) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList<Record<string, unknown>>
        data={currentList}
        keyExtractor={(item) => String((item as { id?: string }).id ?? (item as { tontine?: { id?: string } }).tontine?.id ?? Math.random())}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAll();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title={
                activeTab === 0
                  ? 'Aucune tontine active'
                  : activeTab === 1
                    ? 'Aucune tontine en attente'
                    : 'Aucun historique'
              }
              subtitle={
                activeTab === 0
                  ? 'Créez ou rejoignez une tontine'
                  : activeTab === 1
                    ? 'Les tontines que vous créez apparaîtront ici'
                    : 'Vos tontines terminées apparaîtront ici'
              }
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.scanFab}
          onPress={() => router.push('/scan')}
        >
          <Ionicons name="qr-code-outline" size={24} color="#E85D04" />
        </TouchableOpacity>

        <Pressable
          style={styles.fab}
          onPress={() => router.push('/tontines/create' as never)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      </View>

      {error ? <ErrorMessage message={error} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  tabRow: { flexDirection: 'row', gap: theme.spacing.sm },
  tab: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  tabActive: { backgroundColor: theme.colors.primaryLight },
  tabText: { fontSize: theme.typography.size.sm, color: theme.colors.gray500 },
  tabTextActive: { color: theme.colors.primary, fontWeight: '600' },
  card: {
    margin: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: {
    fontSize: theme.typography.size.md,
    fontWeight: '700',
    color: theme.colors.black,
  },
  cardDesc: { marginTop: 4, fontSize: theme.typography.size.sm, color: theme.colors.gray500 },
  cardStatus: { marginTop: 2, fontSize: theme.typography.size.sm, color: theme.colors.gray500 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  listContent: { flexGrow: 1, paddingBottom: 100 },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  scanFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E85D04',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: { fontSize: 28, color: theme.colors.white, fontWeight: '300' },
});
