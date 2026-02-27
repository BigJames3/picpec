import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../../src/theme';
import { PButton } from '../../src/components/ui/PButton';
import { PCard } from '../../src/components/ui/PCard';

export default function PaymentConfirmationScreen() {
  const params = useLocalSearchParams<{
    status?: string;
    transactionId?: string;
    amount?: string;
    tontineTitle?: string;
  }>();
  const status = params.status ?? 'PENDING';
  const amount = params.amount ?? '0';
  const tontineTitle = params.tontineTitle ?? '';

  const isSuccess = status === 'PENDING' || status === 'SUCCESS';

  const handleBack = () => {
    router.replace('/(tabs)/tontines');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.icon}>{isSuccess ? '✅' : '⏳'}</Text>
        <Text style={styles.title}>
          {isSuccess ? 'Paiement initié' : 'En attente'}
        </Text>
        <Text style={styles.subtitle}>
          {isSuccess
            ? 'Ouvrez l\'application de votre opérateur (MTN MoMo, Orange Money ou Wave) pour finaliser le paiement.'
            : 'Votre paiement est en cours de traitement.'}
        </Text>

        <PCard padding="lg" style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Montant</Text>
            <Text style={styles.value}>
              {Number(amount).toLocaleString()} XOF
            </Text>
          </View>
          {tontineTitle ? (
            <View style={styles.row}>
              <Text style={styles.label}>Tontine</Text>
              <Text style={styles.value} numberOfLines={1}>
                {tontineTitle}
              </Text>
            </View>
          ) : null}
        </PCard>

        <PButton
          label="Voir l'historique"
          variant="outline"
          onPress={() => router.push('/payments/history')}
          fullWidth
          style={{ marginBottom: theme.spacing.md }}
        />
        <PButton
          label="Retour aux tontines"
          onPress={handleBack}
          fullWidth
          style={styles.backBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 64, marginBottom: theme.spacing.lg },
  title: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: '700',
    color: theme.colors.black,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  detailsCard: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
  },
  value: {
    fontSize: theme.typography.size.md,
    fontWeight: '600',
    color: theme.colors.black,
  },
  backBtn: { width: '100%' },
});
