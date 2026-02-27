import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../../src/theme';
import { usePayment, PaymentProvider } from '../../src/hooks/usePayment';
import { PButton } from '../../src/components/ui/PButton';
import { PCard } from '../../src/components/ui/PCard';
import { PInput } from '../../src/components/ui/PInput';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';

const PROVIDERS: { id: PaymentProvider; label: string; emoji: string }[] = [
  { id: 'MTN_MOMO', label: 'MTN MoMo', emoji: '🟡' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', emoji: '🟠' },
  { id: 'WAVE', label: 'Wave', emoji: '🔵' },
];

export default function MobileMoneyScreen() {
  const params = useLocalSearchParams<{
    tontineId: string;
    amount: string;
    tontineTitle?: string;
  }>();
  const tontineId = params.tontineId ?? '';
  const amount = Number(params.amount) || 0;
  const tontineTitle = params.tontineTitle ?? 'Tontine';

  const [provider, setProvider] = useState<PaymentProvider>('MTN_MOMO');
  const [phone, setPhone] = useState('');

  const { initiatePay, loading, error } = usePayment();

  const handleConfirm = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return;
    if (!tontineId) return;

    try {
      const result = await initiatePay({
        tontineId,
        provider,
        phone: trimmedPhone,
      });
      router.replace({
        pathname: '/payments/confirmation',
        params: {
          status: result?.status ?? 'PENDING',
          transactionId: result?.transactionId ?? '',
          amount: String(amount),
          tontineTitle,
        },
      });
    } catch {
      // Error handled by usePayment (ErrorMessage via error state)
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Payer ma cotisation
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Choisir le moyen de paiement</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setProvider(p.id)}
              style={styles.providerWrapper}
            >
              <PCard
                padding="md"
                shadow="sm"
                style={[
                  styles.providerCard,
                  provider === p.id && styles.providerCardSelected,
                ]}
              >
                <Text style={styles.providerEmoji}>{p.emoji}</Text>
                <Text
                  style={[
                    styles.providerLabel,
                    provider === p.id && styles.providerLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {p.label}
                </Text>
              </PCard>
            </Pressable>
          ))}
        </View>

        <PCard padding="lg" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Montant à payer</Text>
          <Text style={styles.summaryAmount}>
            {amount.toLocaleString()} XOF
          </Text>
          {tontineTitle && (
            <Text style={styles.summaryTontine}>{tontineTitle}</Text>
          )}
        </PCard>

        <PInput
          label="Numéro de téléphone"
          placeholder="Ex: 225 07 00 00 00 00"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          required
        />

        <ErrorMessage message={error ?? ''} />

        <PButton
          label="Confirmer le paiement"
          onPress={handleConfirm}
          loading={loading}
          disabled={loading || !phone.trim() || !tontineId}
          fullWidth
          style={styles.confirmBtn}
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
  sectionTitle: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  providerWrapper: { flex: 1, minWidth: 90 },
  providerCard: {
    alignItems: 'center',
    minHeight: 80,
  },
  providerCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  providerEmoji: { fontSize: 28, marginBottom: 4 },
  providerLabel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray700,
    textAlign: 'center',
  },
  providerLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.primary,
  },
  summaryTontine: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginTop: theme.spacing.sm,
  },
  confirmBtn: { marginTop: theme.spacing.lg },
});
