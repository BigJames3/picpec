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
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../src/theme';
import { tontinesApi } from '../../../src/api/tontines.api';
import { PCard } from '../../../src/components/ui/PCard';
import { EmptyState } from '../../../src/components/ui/EmptyState';

interface CycleHistory {
  cycle: number;
  startDate: string;
  endDate: string;
  beneficiary?: { fullName?: string; fullname?: string };
  amount: number;
  paidCount: number;
  totalMembers: number;
}

function getInitials(user?: { fullName?: string; fullname?: string }): string {
  const name = user?.fullName ?? user?.fullname ?? '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TontineHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cycles, setCycles] = useState<CycleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!id) return;
    try {
      const { data } = await tontinesApi.getHistory(id);
      setCycles(Array.isArray(data) ? data : []);
    } catch {
      setCycles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Retour</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Historique</Text>
      </View>

      <FlatList
        data={cycles}
        keyExtractor={(item) => `cycle-${item.cycle}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHistory();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Aucun cycle terminé"
              subtitle="L'historique des cycles s'affichera ici"
              icon="📋"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <PCard padding="lg" style={styles.cycleCard}>
            <Text style={styles.cycleTitle}>
              Cycle {item.cycle} : du{' '}
              {new Date(item.startDate).toLocaleDateString('fr-FR')} au{' '}
              {new Date(item.endDate).toLocaleDateString('fr-FR')}
            </Text>
            <View style={styles.beneficiaryRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(item.beneficiary)}
                </Text>
              </View>
              <View style={styles.beneficiaryInfo}>
                <Text style={styles.beneficiaryLabel}>Bénéficiaire</Text>
                <Text style={styles.beneficiaryName}>
                  {item.beneficiary?.fullName ??
                    item.beneficiary?.fullname ??
                    '—'}
                </Text>
                <Text style={styles.amount}>
                  {item.amount.toLocaleString()} XOF
                </Text>
              </View>
            </View>
            <Text style={styles.paidInfo}>
              {item.paidCount}/{item.totalMembers} membres ont payé
            </Text>
          </PCard>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  backBtn: { fontSize: 16, color: theme.colors.primary, marginRight: 16 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray900,
  },
  list: { padding: 16, paddingBottom: 48 },
  cycleCard: { marginBottom: 16 },
  cycleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray700,
    marginBottom: 12,
  },
  beneficiaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  beneficiaryInfo: { flex: 1 },
  beneficiaryLabel: {
    fontSize: 11,
    color: theme.colors.gray500,
    marginBottom: 2,
  },
  beneficiaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.black,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: 4,
  },
  paidInfo: {
    fontSize: 12,
    color: theme.colors.gray500,
    marginTop: 4,
  },
});
