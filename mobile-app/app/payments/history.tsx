import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../../src/theme';
import { walletApi } from '../../src/api/wallet.api';
import { Transaction } from '../../src/types';
import { PCard } from '../../src/components/ui/PCard';
import { PBadge } from '../../src/components/ui/PBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';

const PROVIDER_EMOJI: Record<string, string> = {
  MTN_MOMO: '🟡',
  ORANGE_MONEY: '🟠',
  WAVE: '🔵',
};
const PROVIDER_LABEL: Record<string, string> = {
  MTN_MOMO: 'MTN MoMo',
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return { variant: 'warning' as const, label: 'En attente' };
    case 'COMPLETED':
      return { variant: 'success' as const, label: 'Succès' };
    case 'FAILED':
    case 'CANCELLED':
      return { variant: 'danger' as const, label: 'Échoué' };
    default:
      return { variant: 'default' as const, label: status };
  }
}

function PaymentItem({ item }: { item: Transaction }) {
  const metadata = (item as Transaction & { metadata?: Record<string, unknown> }).metadata as
    | { provider?: string; tontineTitle?: string }
    | undefined;
  const provider = metadata?.provider ?? 'MTN_MOMO';
  const tontineTitle = metadata?.tontineTitle;
  const emoji = PROVIDER_EMOJI[provider] ?? '💸';
  const providerName = PROVIDER_LABEL[provider] ?? 'Mobile Money';
  const badge = getStatusBadge(item.status);

  return (
    <PCard padding="md" shadow="sm" style={styles.card}>
      <View style={styles.row1}>
        <Text style={styles.providerEmoji}>{emoji}</Text>
        <Text style={styles.providerName}>{providerName}</Text>
        <PBadge variant={badge.variant} label={badge.label} />
      </View>
      <Text style={styles.amount}>
        {item.amount.toLocaleString()} XOF
      </Text>
      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </Text>
      {tontineTitle ? (
        <Text style={styles.tontineName}>{tontineTitle}</Text>
      ) : null}
    </PCard>
  );
}

export default function PaymentsHistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data } = await walletApi.getTransactions({
        type: 'TONTINE_PAYMENT',
        limit: 50,
      });
      setTransactions(data.data ?? []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading && transactions.length === 0) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Historique des paiements
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <PaymentItem item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💸"
            title="Aucun paiement"
            subtitle="Vos paiements apparaîtront ici"
          />
        }
      />
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
  list: { padding: theme.spacing.lg, paddingBottom: 48, flexGrow: 1 },
  card: { marginBottom: theme.spacing.md },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  providerEmoji: { fontSize: 20, marginRight: 6 },
  providerName: {
    flex: 1,
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
  },
  amount: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: theme.spacing.xs,
  },
  tontineName: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray700,
  },
});
