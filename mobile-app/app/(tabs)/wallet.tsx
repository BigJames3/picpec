import { useEffect, useState, useCallback, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { Text, Button, Modal, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/store/auth.store';
import { useWalletStore } from '../../src/store/wallet.store';
import { walletApi } from '../../src/api/wallet.api';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Transaction } from '../../src/types';

type ModalType = 'deposit' | 'withdraw' | 'transfer' | null;
type ProviderType = 'MTN_MOMO' | 'ORANGE_MONEY' | 'WAVE';
type FilterType =
  | 'ALL'
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'TRANSFER'
  | 'TONTINE_PAYMENT'
  | 'PRODUCT_PURCHASE';

const filters: { label: string; value: FilterType; emoji: string }[] = [
  { label: 'Tout', value: 'ALL', emoji: '📋' },
  { label: 'Dépôts', value: 'DEPOSIT', emoji: '⬇️' },
  { label: 'Retraits', value: 'WITHDRAW', emoji: '⬆️' },
  { label: 'Transferts', value: 'TRANSFER', emoji: '↔️' },
  { label: 'Tontines', value: 'TONTINE_PAYMENT', emoji: '🤝' },
  { label: 'Achats', value: 'PRODUCT_PURCHASE', emoji: '🛍️' },
];

function TransactionItem({
  item,
  onPress,
}: {
  item: Transaction;
  onPress: () => void;
}) {
  const isCredit = ['DEPOSIT', 'TONTINE_PAYOUT'].includes(item.type);
  const labels: Record<string, string> = {
    DEPOSIT: 'Dépôt',
    WITHDRAW: 'Retrait',
    TRANSFER: 'Transfert',
    TONTINE_PAYMENT: 'Cotisation',
    TONTINE_PAYOUT: 'Gain tontine',
    PRODUCT_PURCHASE: 'Achat',
  };
  return (
    <TouchableOpacity style={styles.txItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.txLeft}>
        <Text style={styles.txType}>{labels[item.type] ?? item.type}</Text>
        <Text style={styles.txDate}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR')}
        </Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          { color: isCredit ? '#16A34A' : '#DC2626' },
        ]}
      >
        {isCredit ? '+' : '-'}
        {item.amount.toLocaleString()} XOF
      </Text>
    </TouchableOpacity>
  );
}

export default function WalletScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const params = useLocalSearchParams<{
    pinVerified?: string;
    context?: string;
    amount?: string;
    provider?: string;
    phone?: string;
    receiverId?: string;
    note?: string;
    useExternalMM?: string;
  }>();
  const {
    balance,
    transactions,
    fetchBalance,
    fetchTransactions,
    fetchMoreTransactions,
    hasMore,
    isLoading,
  } = useWalletStore();
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState(0);
  const [receiverId, setReceiverId] = useState('');
  const [note, setNote] = useState('');
  const [provider, setProvider] = useState<ProviderType>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [useExternalMM, setUseExternalMM] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const pinProcessedRef = useRef(false);

  const filteredTransactions = transactions.filter((t) =>
    activeFilter === 'ALL' ? true : t.type === activeFilter,
  );

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    fetchBalance();
    fetchTransactions();
  }, [isHydrated, accessToken, fetchBalance, fetchTransactions]);

  const executeAction = useCallback(
    async (
      ctx?: ModalType,
      p?: {
        amount?: string;
        provider?: string;
        phone?: string;
        receiverId?: string;
        note?: string;
        useExternalMM?: string;
      },
    ) => {
      const ctxModal = ctx ?? modal;
      const amt = p?.amount ? parseInt(p.amount, 10) : amount;
      const prov = (p?.provider as ProviderType) ?? provider;
      const ph = p?.phone ?? phone;
      const extMM = p?.useExternalMM === 'true' || useExternalMM;

      setSubmitting(true);
      setError('');
      try {
        if (ctxModal === 'deposit') {
          if (extMM) {
            const res = await walletApi.depositMobileMoney(amt, prov, ph);
            if (res.data?.checkoutUrl) {
              const canOpen = await Linking.canOpenURL(res.data.checkoutUrl);
              if (canOpen) await Linking.openURL(res.data.checkoutUrl);
            }
          } else {
            await walletApi.deposit(amt);
          }
        } else if (ctxModal === 'withdraw') {
          if (extMM) {
            await walletApi.withdrawMobileMoney(amt, prov, ph);
          } else {
            await walletApi.withdraw(amt);
          }
        } else if (ctxModal === 'transfer') {
          await walletApi.transfer(
            p?.receiverId ?? receiverId,
            amt,
            p?.note ?? note,
          );
        }
        await fetchBalance();
        await fetchTransactions();
        setModal(null);
        setAmount(0);
        setReceiverId('');
        setNote('');
        setPhone('');
      } catch (err: unknown) {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Erreur',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [modal, amount, provider, phone, receiverId, note, useExternalMM],
  );

  useEffect(() => {
    if (
      params.pinVerified === 'true' &&
      params.context &&
      !pinProcessedRef.current
    ) {
      pinProcessedRef.current = true;
      executeAction(params.context as ModalType, {
        amount: params.amount,
        provider: params.provider,
        phone: params.phone,
        receiverId: params.receiverId,
        note: params.note,
        useExternalMM: params.useExternalMM,
      });
    }
  }, [params.pinVerified, params.context, executeAction]);

  const handleAction = async () => {
    if (modal === 'transfer' && !receiverId) {
      setError('ID du destinataire requis');
      return;
    }
    if (amount <= 0) {
      setError('Montant invalide');
      return;
    }
    if (
      (modal === 'deposit' || modal === 'withdraw') &&
      useExternalMM &&
      !phone.trim()
    ) {
      setError('Numéro Mobile Money requis');
      return;
    }
    setError('');

    const storedPin = await SecureStore.getItemAsync('picpec_pin');
    if (storedPin) {
      router.push({
        pathname: '/wallet/pin',
        params: {
          context: modal ?? '',
          amount: String(amount),
          provider,
          phone,
          receiverId,
          note,
          useExternalMM: String(useExternalMM),
          returnTo: '/(tabs)/wallet',
        },
      });
      setModal(null);
      return;
    }

    await executeAction();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceAmount}>
          {balance.toLocaleString()} XOF
        </Text>
      </View>

      <View style={styles.actions}>
        {(['deposit', 'withdraw', 'transfer'] as const).map((action) => (
          <Button
            key={action}
            mode="contained"
            onPress={() => {
              setModal(action);
              setError('');
              setAmount(0);
              setUseExternalMM(false);
              setPhone('');
              pinProcessedRef.current = false;
            }}
            style={styles.actionBtn}
            buttonColor={
              action === 'deposit'
                ? '#16A34A'
                : action === 'withdraw'
                  ? '#DC2626'
                  : '#E85D04'
            }
          >
            {action === 'deposit'
              ? '⬇ Dépôt'
              : action === 'withdraw'
                ? '⬆ Retrait'
                : '↔ Transfert'}
          </Button>
        ))}
        <Button
          mode="outlined"
          onPress={() => router.push('/wallet/receive')}
          style={styles.receiveBtn}
        >
          📥 Recevoir
        </Button>
      </View>

      <Text variant="titleMedium" style={styles.historyTitle}>
        Historique
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              activeFilter === f.value && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.emoji} {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={filteredTransactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onPress={() => router.push(`/wallet/transaction-detail?id=${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              fetchBalance();
              fetchTransactions();
            }}
          />
        }
        onEndReached={() => fetchMoreTransactions()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMore && filteredTransactions.length > 0 ? (
            <ActivityIndicator
              color="#E85D04"
              size="small"
              style={{ padding: 16 }}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune transaction"
            subtitle="Votre historique apparaîtra ici"
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />

      <Portal>
        <Modal
          visible={!!modal}
          onDismiss={() => setModal(null)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {modal === 'deposit'
              ? 'Effectuer un dépôt'
              : modal === 'withdraw'
                ? 'Effectuer un retrait'
                : 'Transférer des fonds'}
          </Text>
          {(modal === 'deposit' || modal === 'withdraw') && (
            <>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    !useExternalMM && styles.toggleBtnActive,
                  ]}
                  onPress={() => setUseExternalMM(false)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      !useExternalMM && styles.toggleTextActive,
                    ]}
                  >
                    💳 Manuel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    useExternalMM && styles.toggleBtnActive,
                  ]}
                  onPress={() => setUseExternalMM(true)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      useExternalMM && styles.toggleTextActive,
                    ]}
                  >
                    📱 Mobile Money
                  </Text>
                </TouchableOpacity>
              </View>
              {useExternalMM && (
                <>
                  <View style={styles.providerRow}>
                    {(
                      ['MTN_MOMO', 'ORANGE_MONEY', 'WAVE'] as const
                    ).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.providerBtn,
                          provider === p && styles.providerBtnActive,
                        ]}
                        onPress={() => setProvider(p)}
                      >
                        <Text style={styles.providerEmoji}>
                          {p === 'MTN_MOMO'
                            ? '🟡'
                            : p === 'ORANGE_MONEY'
                              ? '🟠'
                              : '🔵'}
                        </Text>
                        <Text
                          style={[
                            styles.providerLabel,
                            provider === p && styles.providerLabelActive,
                          ]}
                        >
                          {p === 'MTN_MOMO'
                            ? 'MTN'
                            : p === 'ORANGE_MONEY'
                              ? 'Orange'
                              : 'Wave'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    placeholder="Numéro Mobile Money"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={[styles.inputBase, styles.modalInput]}
                  />
                </>
              )}
            </>
          )}
          {modal === 'transfer' && (
            <TextInput
              placeholder="ID du destinataire (UUID)"
              value={receiverId}
              onChangeText={setReceiverId}
              style={[styles.inputBase, styles.modalInput]}
            />
          )}
          <AmountInput value={amount} onChange={setAmount} />
          <ErrorMessage message={error} />
          <Button
            mode="contained"
            onPress={handleAction}
            loading={submitting}
            disabled={submitting}
            style={{ marginTop: 16 }}
            buttonColor="#E85D04"
          >
            Confirmer
          </Button>
          <Button mode="text" onPress={() => setModal(null)}>
            Annuler
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  balanceCard: {
    backgroundColor: '#E85D04',
    padding: 32,
    alignItems: 'center',
  },
  balanceLabel: { color: '#FED7AA', fontSize: 14 },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 },
  actionBtn: { flex: 1, minWidth: 80 },
  receiveBtn: { flex: 1, minWidth: 120 },
  historyTitle: { paddingHorizontal: 16, paddingVertical: 8 },
  filtersRow: { marginVertical: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#E85D04',
    borderColor: '#E85D04',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  txLeft: { gap: 2 },
  txType: { fontWeight: '600', fontSize: 14 },
  txDate: { color: '#9CA3AF', fontSize: 12 },
  txAmount: { fontWeight: 'bold', fontSize: 16 },
  modal: {
    backgroundColor: '#fff',
    margin: 24,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: { marginBottom: 16, fontWeight: 'bold' },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  toggleBtnActive: { borderColor: '#E85D04', backgroundColor: '#FFF0E6' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#E85D04' },
  providerRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  providerBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  providerBtnActive: { borderColor: '#E85D04', backgroundColor: '#FFF0E6' },
  providerEmoji: { fontSize: 20, marginBottom: 2 },
  providerLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  providerLabelActive: { color: '#E85D04' },
  inputBase: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalInput: { marginBottom: 8 },
});
