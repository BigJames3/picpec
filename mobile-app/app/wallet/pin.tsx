import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { theme } from '../../src/theme';

const PIN_LENGTH = 4;
const PIN_KEY = 'picpec_pin';

export default function PinScreen() {
  const pinParams = useLocalSearchParams<{
    context?: string;
    amount?: string;
    provider?: string;
    phone?: string;
    receiverId?: string;
    note?: string;
    useExternalMM?: string;
    returnTo?: string;
    productId?: string;
    quantity?: string;
    shippingAddress?: string;
  }>();
  const { context } = pinParams;
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const pinStr = pin.join('');

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDigit = (d: number) => {
    if (pinStr.length >= PIN_LENGTH) return;
    setError('');
    const newPin = [...pin];
    newPin[pinStr.length] = String(d);
    setPin(newPin);
    if (newPin.every((p) => p)) {
      verifyPin(newPin.join(''));
    }
  };

  const handleBack = () => {
    if (pinStr.length === 0) return;
    const newPin = [...pin];
    newPin[pinStr.length - 1] = '';
    setPin(newPin);
    setError('');
  };

  const handleSuccess = () => {
    const returnTo = pinParams.returnTo || '/(tabs)/wallet';
    if (context) {
      router.replace({
        pathname: returnTo as '/',
        params: {
          pinVerified: 'true',
          context,
          amount: pinParams.amount,
          provider: pinParams.provider,
          phone: pinParams.phone,
          receiverId: pinParams.receiverId,
          note: pinParams.note,
          useExternalMM: pinParams.useExternalMM,
          productId: pinParams.productId,
          quantity: pinParams.quantity,
          shippingAddress: pinParams.shippingAddress,
        },
      });
    } else {
      router.back();
    }
  };

  const verifyPin = async (entered: string) => {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    if (stored === entered) {
      handleSuccess();
    } else {
      setPin(Array(PIN_LENGTH).fill(''));
      setError('PIN incorrect');
      shake();
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Réinitialiser le PIN',
      'Pour réinitialiser votre PIN, vous devez le supprimer. Vous pourrez en définir un nouveau dans les paramètres.',
      [
        {
          text: 'Supprimer le PIN actuel',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync(PIN_KEY);
            Alert.alert(
              'PIN supprimé',
              "Vous pouvez définir un nouveau PIN dans les paramètres du profil.",
            );
            router.back();
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  const subtitle =
    context === 'deposit'
      ? 'Confirmez votre identité pour effectuer un dépôt'
      : context === 'withdraw'
        ? 'Confirmez votre identité pour effectuer un retrait'
        : context === 'transfer'
          ? 'Confirmez votre identité pour transférer'
          : context === 'purchase'
            ? 'Confirmez votre achat avec votre PIN'
            : 'Confirmez avec votre PIN';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Confirmer avec votre PIN</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Animated.View
        style={[
          styles.dotsRow,
          {
            transform: [{ translateX: shakeAnim }],
          },
        ]}
      >
        {pin.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin[i] && styles.dotFilled,
            ]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.keypad}>
        {[
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
          [null, 0, 'back'],
        ].map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((n, ci) =>
              n === null ? (
                <View key={ci} style={styles.key} />
              ) : n === 'back' ? (
                <TouchableOpacity
                  key={ci}
                  style={styles.key}
                  onPress={handleBack}
                >
                  <Text style={styles.keyText}>←</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={ci}
                  style={styles.key}
                  onPress={() => handleDigit(Number(n))}
                >
                  <Text style={styles.keyText}>{n}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.forgot} onPress={handleForgotPin}>
        <Text style={styles.forgotText}>Oublié votre PIN ?</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: 24,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontWeight: 'bold',
    color: theme.colors.gray900,
    textAlign: 'center',
    marginTop: 32,
  },
  subtitle: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray500,
    textAlign: 'center',
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.gray300,
  },
  dotFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  error: {
    fontSize: 14,
    color: theme.colors.danger,
    textAlign: 'center',
    marginTop: 16,
  },
  keypad: { marginTop: 48, alignItems: 'center' },
  keypadRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: { fontSize: 24, fontWeight: '600', color: theme.colors.gray900 },
  forgot: { alignSelf: 'center', marginTop: 32 },
  forgotText: { fontSize: 14, color: theme.colors.primary },
});
