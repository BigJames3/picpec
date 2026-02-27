import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useWalletStore } from '../../src/store/wallet.store';
import { walletApi } from '../../src/api/wallet.api';
import { theme } from '../../src/theme';
import { PCard } from '../../src/components/ui/PCard';
import { PButton } from '../../src/components/ui/PButton';
import { PBadge } from '../../src/components/ui/PBadge';
import { Transaction } from '../../src/types';

const transactionConfig: Record<
  string,
  { emoji: string; color: string; label: string; sign: string }
> = {
  DEPOSIT: {
    emoji: '⬇️',
    color: '#22c55e',
    label: 'Dépôt',
    sign: '+',
  },
  WITHDRAW: {
    emoji: '⬆️',
    color: '#ef4444',
    label: 'Retrait',
    sign: '-',
  },
  TRANSFER: {
    emoji: '↔️',
    color: '#3b82f6',
    label: 'Transfert',
    sign: '-',
  },
  TONTINE_PAYMENT: {
    emoji: '🤝',
    color: '#f97316',
    label: 'Cotisation tontine',
    sign: '-',
  },
  TONTINE_PAYOUT: {
    emoji: '🎉',
    color: '#22c55e',
    label: 'Gain tontine',
    sign: '+',
  },
  PRODUCT_PURCHASE: {
    emoji: '🛍️',
    color: '#8b5cf6',
    label: 'Achat produit',
    sign: '-',
  },
};

const STATUS_VARIANT = {
  COMPLETED: 'success' as const,
  PENDING: 'warning' as const,
  FAILED: 'danger' as const,
  CANCELLED: 'default' as const,
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions } = useWalletStore();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = transactions.find((t) => t.id === id);
    if (cached) {
      setTx(cached);
      setLoading(false);
      return;
    }
    walletApi
      .getTransactionById(id)
      .then((res) => setTx(res.data))
      .catch(() => setTx(null))
      .finally(() => setLoading(false));
  }, [id, transactions]);

  const handleShare = async () => {
    if (!tx) return;
    await Share.share({
      message: `Transaction PICPEC\n${tx.type}: ${tx.amount.toLocaleString()} XOF\nRéf: ${tx.reference}\n${new Date(tx.createdAt).toLocaleString('fr-FR')}`,
      title: 'Reçu PICPEC',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!tx) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.notFound}>Transaction non trouvée</Text>
      </SafeAreaView>
    );
  }

  const config = transactionConfig[tx.type] ?? {
    emoji: '📋',
    color: theme.colors.gray700,
    label: tx.type,
    sign: '-',
  };
  const isCredit = config.sign === '+';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Détail transaction</Text>
      </View>

      <PCard padding="lg" shadow="md" style={styles.card}>
        <View style={styles.iconRow}>
          <Text style={styles.icon}>{config.emoji}</Text>
          <Text
            style={[
              styles.amount,
              { color: config.color },
            ]}
          >
            {config.sign}
            {tx.amount.toLocaleString()} XOF
          </Text>
        </View>

        <PBadge
          label={tx.status}
          variant={STATUS_VARIANT[tx.status] ?? 'default'}
          dot
        />

        <View style={styles.row}>
          <Text style={styles.label}>Référence</Text>
          <Text style={styles.value}>{tx.reference}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>
            {new Date(tx.createdAt).toLocaleString('fr-FR', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{config.label}</Text>
        </View>

        {(tx.senderId || tx.receiverId) && (
          <View style={styles.parties}>
            <Text style={styles.label}>Détails</Text>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(tx.senderId?.slice(0, 8))}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(tx.receiverId?.slice(0, 8))}
                </Text>
              </View>
            </View>
          </View>
        )}

        {tx.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.label}>Note</Text>
            <Text style={styles.note}>{tx.note}</Text>
          </View>
        ) : null}
      </PCard>

      <PButton
        label="Partager le reçu"
        onPress={handleShare}
        variant="outline"
        fullWidth
        style={{ marginHorizontal: 24, marginTop: 16 }}
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
  back: { marginRight: 16 },
  backText: { fontSize: 16, color: theme.colors.primary },
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.gray900 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    marginTop: 48,
    fontSize: 16,
    color: theme.colors.gray500,
  },
  card: { margin: 24 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { fontSize: 40 },
  amount: { fontSize: 28, fontWeight: 'bold' },
  row: { marginTop: 16 },
  label: { fontSize: 12, color: theme.colors.gray500, marginBottom: 4 },
  value: { fontSize: 14, color: theme.colors.gray900, fontWeight: '500' },
  parties: { marginTop: 20 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  arrow: { fontSize: 18, color: theme.colors.gray500 },
  noteBox: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  note: { fontSize: 14, color: theme.colors.gray700, fontStyle: 'italic' },
});
