import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PInput } from '../src/components/ui/PInput';
import { PButton } from '../src/components/ui/PButton';
import { theme } from '../src/theme';
import api from '../src/api/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Email requis');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email invalide');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mot de passe oublié</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.desc}>
          Entrez votre email pour recevoir un code de réinitialisation.
        </Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentTitle}>Code envoyé !</Text>
            <Text style={styles.sentText}>
              Si un compte existe pour {email}, vous recevrez un code par email.
            </Text>
            <PButton
              label="Aller à la vérification"
              onPress={() =>
                router.push({
                  pathname: '/otp-verification',
                  params: { email },
                })
              }
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <>
            <PInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={error}
              required
              placeholder="votre@email.com"
            />
            <PButton
              label="Envoyer le code"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              fullWidth
              style={{ marginTop: 8 }}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.linkText}>Retour à la connexion</Text>
        </TouchableOpacity>
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
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: 24 },
  desc: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray500,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  sentBox: {
    backgroundColor: theme.colors.successLight,
    padding: 20,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  sentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: 8,
  },
  sentText: { fontSize: 14, color: theme.colors.gray700 },
  link: { marginTop: 32, alignSelf: 'center' },
  linkText: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
});
