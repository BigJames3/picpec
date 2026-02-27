import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { tontinesApi } from '../../../src/api/tontines.api';

const FREQ_LABELS: Record<string, string> = {
  JOURNALIER: 'Journalier',
  HEBDOMADAIRE: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
};

export default function JoinTontinePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [tontine, setTontine] = useState<{
    titre?: string;
    description?: string;
    montant?: number;
    nombreMembres?: number;
    frequence?: string;
    dateDebut?: string;
  } | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace({
        pathname: '/login',
        params: {
          redirect: `/tontine/join/${token}`,
        },
      });
      return;
    }

    loadTontine();
  }, [isHydrated, isAuthenticated, token]);

  const loadTontine = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await tontinesApi.getByInviteToken(token);
      setTontine(res.tontine ?? null);
      setCanJoin(res.canJoin ?? false);
      setReason(res.reason ?? null);
      if (!res.canJoin && res.reason) {
        setError(res.reason);
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Invitation invalide ou expirée';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!token || !canJoin) return;
    try {
      setIsJoining(true);
      await tontinesApi.joinByToken(token);

      Alert.alert(
        '🎉 Félicitations !',
        `Vous avez rejoint la tontine "${tontine?.titre ?? ''}".`,
        [
          {
            text: 'Voir la tontine',
            onPress: () => router.replace('/(tabs)/tontines'),
          },
        ],
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Impossible de rejoindre';
      Alert.alert('❌ Erreur', msg);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E85D04" />
        <Text style={styles.loadingText}>Chargement de l&apos;invitation...</Text>
      </View>
    );
  }

  if (error && !tontine?.titre) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>❌</Text>
        <Text style={styles.errorTitle}>Invitation invalide</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)/tontines')}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🤝</Text>
      <Text style={styles.title}>Invitation à une tontine</Text>

      <View style={styles.card}>
        <Text style={styles.tontineName}>{tontine?.titre ?? '—'}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Montant cotisation</Text>
          <Text style={styles.infoValue}>
            {Number(tontine?.montant ?? 0).toLocaleString()} XOF
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fréquence</Text>
          <Text style={styles.infoValue}>
            {FREQ_LABELS[tontine?.frequence ?? ''] ?? tontine?.frequence ?? '—'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Membres</Text>
          <Text style={styles.infoValue}>
            {tontine?.nombreMembres ?? '—'} membres max
          </Text>
        </View>

        {reason && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Statut</Text>
            <Text style={styles.infoValue}>{reason}</Text>
          </View>
        )}
      </View>

      {canJoin ? (
        <TouchableOpacity
          style={[styles.button, isJoining && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Rejoindre la tontine</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.cannotJoinText}>
          {error ?? 'Vous ne pouvez pas rejoindre cette tontine.'}
        </Text>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.replace('/(tabs)/tontines')}
      >
        <Text style={styles.cancelText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  tontineName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E85D04',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#E85D04',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelText: {
    color: '#888',
    fontSize: 14,
  },
  cannotJoinText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 14,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
});
