import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PButton } from '../../src/components/ui/PButton';
import { PCard } from '../../src/components/ui/PCard';
import { theme } from '../../src/theme';
import axios from 'axios';

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:3000';

export default function TestPanelScreen() {
  const [log, setLog] = useState<string[]>([]);
  const [cycleId, setCycleId] = useState('');

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const run = async (
    label: string,
    fn: () => Promise<unknown>
  ): Promise<unknown> => {
    try {
      addLog(`⏳ ${label}...`);
      const result = await fn();
      addLog(`✅ ${label} — OK`);
      return result;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      addLog(
        `❌ ${label} — ${err?.response?.data?.message ?? err?.message ?? 'Erreur'}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PButton
          label="← Retour"
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
        />
        <Text style={styles.title}>🧪 Panel de Test Local</Text>
      </View>
      <Text style={styles.warning}>⚠️ Visible uniquement en développement</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>Initialisation</Text>
          <PButton
            label="Reset BDD"
            onPress={() => run('Reset', () => axios.post(`${API_BASE}/api/test/reset`))}
            variant="danger"
            size="sm"
            fullWidth
          />
          <View style={{ height: 8 }} />
          <PButton
            label="Créer utilisateurs test"
            onPress={() =>
              run('Seed users', () => axios.post(`${API_BASE}/api/test/seed/users`))
            }
            variant="outline"
            size="sm"
            fullWidth
          />
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>Cycle ID (pour actions ci-dessous)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: clxxx..."
            value={cycleId}
            onChangeText={setCycleId}
            placeholderTextColor={theme.colors.gray500}
          />
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>Simulation Paiement</Text>
          <PButton
            label="Payer toutes les cotisations (cycle)"
            onPress={() =>
              run('Pay all', () =>
                axios.post(`${API_BASE}/api/test/pay-all/${cycleId}`)
              )
            }
            variant="primary"
            size="sm"
            fullWidth
          />
          <View style={{ height: 8 }} />
          <PButton
            label="Expirer un cycle (test pénalités)"
            onPress={() =>
              run('Expire', () =>
                axios.post(`${API_BASE}/api/test/expire-cycle/${cycleId}`)
              )
            }
            variant="outline"
            size="sm"
            fullWidth
          />
          <View style={{ height: 8 }} />
          <PButton
            label="Déclencher CRON pénalités"
            onPress={() =>
              run('CRON', () =>
                axios.post(`${API_BASE}/api/test/trigger/penalties`)
              )
            }
            variant="outline"
            size="sm"
            fullWidth
          />
        </PCard>

        <PCard padding="md" shadow="sm">
          <Text style={styles.sectionTitle}>Logs</Text>
          {log.length === 0 ? (
            <Text style={{ color: theme.colors.gray500 }}>
              Aucune action effectuée
            </Text>
          ) : (
            log.map((l, i) => (
              <Text key={i} style={styles.log}>
                {l}
              </Text>
            ))
          )}
        </PCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.size.lg,
    fontWeight: '700',
    color: theme.colors.black,
    textAlign: 'center',
  },
  warning: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.warning,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 48 },
  sectionTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.size.base,
    color: theme.colors.black,
  },
  log: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray700,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
