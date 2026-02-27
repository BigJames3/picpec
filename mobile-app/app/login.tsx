import { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { authApi } from '../src/api/auth.api';
import { ErrorMessage } from '../src/components/ui/ErrorMessage';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
});
type FormData = z.infer<typeof schema>;

const API_HEALTH_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.134:3000';

const translateError = (msg: string): string => {
  const translations: Record<string, string> = {
    'Invalid credentials': 'Email ou mot de passe incorrect',
    'email must be an email': 'Email invalide',
    'password must be longer than or equal to 6 characters':
      'Le mot de passe doit contenir au moins 6 caractères',
  };
  return translations[msg] ?? msg;
};

function normalizeUser(u: Record<string, unknown>): import('../src/types').User {
  const raw = u as { id?: string; email?: string; fullname?: string; fullName?: string; role?: string; walletBalance?: number; isActive?: boolean; createdAt?: string; phone?: string; avatar?: string };
  return {
    id: raw.id ?? '',
    email: raw.email ?? '',
    fullName: raw.fullName ?? raw.fullname ?? '',
    role: (raw.role as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER') ?? 'USER',
    walletBalance: Number(raw.walletBalance ?? 0),
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    phone: raw.phone,
    avatar: raw.avatar as string | undefined,
  };
}

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    setApiError('');
    try {
      const { data } = await authApi.login(values.email, values.password);
      await setAuth({
        ...data,
        user: normalizeUser(data.user as unknown as Record<string, unknown>),
      });
      router.replace('/(tabs)/home');
    } catch (err: unknown) {
      const msg = (err as {
        response?: { data?: { message?: string | string[] } };
      })?.response?.data?.message;

      const displayMsg = Array.isArray(msg)
        ? msg.map(translateError).join('. ')
        : translateError(msg ?? 'Email ou mot de passe incorrect');

      setApiError(displayMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        🟠 PICPEC
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Connexion à votre compte
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            placeholder="Email"
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, errors.email && styles.inputError]}
          />
        )}
      />
      {errors.email && <ErrorMessage message={errors.email.message!} />}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            placeholder="Mot de passe"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            style={[styles.input, errors.password && styles.inputError]}
          />
        )}
      />
      {errors.password && <ErrorMessage message={errors.password.message!} />}

      <TouchableOpacity
        onPress={() => router.push('/forgot-password')}
        style={styles.forgotLink}
      >
        <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          try {
            const res = await fetch(`${API_HEALTH_URL}/api/health`);
            const data = await res.json();
            Alert.alert('✅ Connexion OK', JSON.stringify(data, null, 2));
          } catch (e: unknown) {
            console.error('Test connexion:', e);
            Alert.alert(
              '❌ Connexion échouée',
              (e as Error)?.message ?? 'Erreur réseau'
            );
          }
        }}
        style={styles.testBtn}
      >
        <Text style={styles.testBtnText}>🔌 Tester la connexion</Text>
      </TouchableOpacity>

      <ErrorMessage message={apiError} />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.button}
        buttonColor="#E85D04"
      >
        Se connecter
      </Button>

      <Button mode="text" onPress={() => router.push('/register')}>
        Pas de compte ? S'inscrire
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#E85D04',
    marginBottom: 8,
  },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputError: { borderColor: '#DC2626' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 8 },
  testBtn: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  testBtnText: { fontSize: 14, color: '#E85D04' },
  forgotText: { fontSize: 14, color: '#E85D04' },
  button: { marginTop: 16, marginBottom: 8 },
});
