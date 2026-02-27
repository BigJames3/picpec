import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { authApi } from '../src/api/auth.api';
import { ErrorMessage } from '../src/components/ui/ErrorMessage';

const schema = z
  .object({
    fullName: z.string().min(2, 'Minimum 2 caractères'),
    email: z.string().email('Email invalide'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Minimum 8 caractères'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

const translateError = (msg: string): string => {
  const translations: Record<string, string> = {
    'Email already registered': 'Cet email est déjà utilisé',
    'email must be an email': 'Email invalide',
    'password must be longer than or equal to 6 characters':
      'Le mot de passe doit contenir au moins 6 caractères',
    'fullName should not be empty': 'Le nom complet est requis',
    'fullName must be a string': 'Le nom complet est invalide',
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

export default function RegisterScreen() {
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
      const { data } = await authApi.register({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
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
        : translateError(msg ?? "Erreur d'inscription");

      setApiError(displayMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        🟠 PICPEC
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Créer un compte
      </Text>

      {(
        ['fullName', 'email', 'phone', 'password', 'confirmPassword'] as const
      ).map((field) => (
        <View key={field}>
          <Controller
            control={control}
            name={field}
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder={
                  {
                    fullName: 'Nom complet',
                    email: 'Email',
                    phone: 'Téléphone (optionnel)',
                    password: 'Mot de passe',
                    confirmPassword: 'Confirmer le mot de passe',
                  }[field]
                }
                value={value ?? ''}
                onChangeText={onChange}
                style={[styles.input, errors[field] && styles.inputError]}
                keyboardType={
                  field === 'email'
                    ? 'email-address'
                    : field === 'phone'
                      ? 'phone-pad'
                      : 'default'
                }
                secureTextEntry={
                  field === 'password' || field === 'confirmPassword'
                }
                autoCapitalize={field === 'email' ? 'none' : 'sentences'}
              />
            )}
          />
          {errors[field] && (
            <ErrorMessage message={errors[field]?.message ?? ''} />
          )}
        </View>
      ))}

      <ErrorMessage message={apiError} />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.button}
        buttonColor="#E85D04"
      >
        S'inscrire
      </Button>
      <Button mode="text" onPress={() => router.push('/login')}>
        Déjà un compte ? Se connecter
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#E85D04',
    marginBottom: 8,
    marginTop: 48,
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
  button: { marginTop: 16, marginBottom: 8 },
});
