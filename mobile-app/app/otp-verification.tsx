import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PButton } from '../src/components/ui/PButton';
import { theme } from '../src/theme';
import api from '../src/api/client';

const OTP_LENGTH = 6;

export default function OTPVerificationScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const next = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[next]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const code = otp.join('');
  const isValid = code.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { email: email ?? '', code });
      router.replace({
        pathname: '/reset-password',
        params: { email: email ?? '', code },
      });
    } catch {
      setError('Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(45);
    setOtp(Array(OTP_LENGTH).fill(''));
    setError('');
    try {
      await api.post('/auth/resend-otp', { email: email ?? '' });
    } catch {
      setError('Erreur lors de l\'envoi');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vérification</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.desc}>
          Code envoyé à{'\n'}
          <Text style={styles.email}>{email ?? ''}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => (inputRefs.current[i] = r)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
              ]}
              value={digit}
              onChangeText={(v) => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(i, nativeEvent.key)
              }
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.timerBox}>
          <Text style={styles.timerText}>
            {timer > 0
              ? `Renvoyer le code (${timer}s)`
              : 'Code expiré ?'}
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={timer > 0}
            style={timer > 0 && styles.linkDisabled}
          >
            <Text
              style={[
                styles.resend,
                timer === 0 && styles.resendActive,
              ]}
            >
              Renvoyer
            </Text>
          </TouchableOpacity>
        </View>

        <PButton
          label="Vérifier"
          onPress={handleVerify}
          loading={loading}
          disabled={!isValid || loading}
          fullWidth
          style={{ marginTop: 32 }}
        />
      </View>
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
  desc: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray700,
    textAlign: 'center',
    marginBottom: 24,
  },
  email: { fontWeight: '600', color: theme.colors.primary },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.black,
  },
  otpInputFilled: { borderColor: theme.colors.primary },
  error: {
    fontSize: 12,
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  timerBox: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  timerText: { fontSize: 14, color: theme.colors.gray500 },
  linkDisabled: { opacity: 0.5 },
  resend: { fontSize: 14, color: theme.colors.gray500 },
  resendActive: { color: theme.colors.primary, fontWeight: '600' },
});
