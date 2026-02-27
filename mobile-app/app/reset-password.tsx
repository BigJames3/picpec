import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PInput } from '../src/components/ui/PInput';
import { PButton } from '../src/components/ui/PButton';
import { theme } from '../src/theme';
import api from '../src/api/client';

function getPasswordStrength(pwd: string): {
  score: number;
  color: string;
  label: string;
} {
  if (!pwd) return { score: 0, color: theme.colors.gray300, label: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const colors = [theme.colors.danger, theme.colors.warning, theme.colors.primary, theme.colors.success];
  const labels = ['Faible', 'Moyen', 'Bon', 'Fort'];
  return {
    score,
    color: colors[Math.min(score - 1, 3)],
    label: labels[Math.min(score - 1, 3)],
  };
}

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Minimum 8 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email ?? '',
        code: code ?? '',
        newPassword: password,
      });
      setSuccess(true);
    } catch {
      setError('Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Mot de passe réinitialisé</Text>
          <Text style={styles.successText}>
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </Text>
          <PButton
            label="Se connecter"
            onPress={() => router.replace('/login')}
            fullWidth
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau mot de passe</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PInput
          label="Nouveau mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Min. 8 caractères"
          required
        />

        {password.length > 0 && (
          <View style={styles.strengthBox}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  {
                    width: `${(strength.score / 4) * 100}%`,
                    backgroundColor: strength.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>
              {strength.label}
            </Text>
          </View>
        )}

        <PInput
          label="Confirmer le mot de passe"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Répétez le mot de passe"
          error={confirm && password !== confirm ? 'Ne correspond pas' : undefined}
          required
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PButton
          label="Réinitialiser"
          onPress={handleSubmit}
          loading={loading}
          disabled={
            loading ||
            password.length < 8 ||
            password !== confirm
          }
          fullWidth
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  back: { fontSize: 16, color: theme.colors.primary, marginRight: 16 },
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.gray900 },
  content: { padding: 24, paddingTop: 32 },
  strengthBox: { marginBottom: theme.spacing.md },
  strengthBar: {
    height: 4,
    backgroundColor: theme.colors.gray300,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600' },
  error: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 8,
  },
  successBox: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: theme.colors.gray700,
    textAlign: 'center',
    lineHeight: 22,
  },
});
