import { useState, useRef, useEffect } from 'react';
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

type Step = 'old' | 'new' | 'confirm';

export default function SetupPinScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isChange = mode === 'change';

  const [step, setStep] = useState<Step>(isChange ? 'old' : 'new');
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isChange);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const pinStr = pin.join('');

  useEffect(() => {
    if (isChange) {
      SecureStore.getItemAsync(PIN_KEY).then((stored) => {
        setLoading(false);
        if (!stored) {
          Alert.alert(
            'Aucun PIN',
            'Aucun code PIN n\'est configuré. Vous allez en créer un.',
            [{ text: 'OK', onPress: () => setStep('new') }],
          );
        }
      });
    }
  }, [isChange]);

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
    const newPinArr = [...pin];
    newPinArr[pinStr.length] = String(d);
    setPin(newPinArr);
    if (newPinArr.every((p) => p)) {
      processPin(newPinArr.join(''));
    }
  };

  const handleBack = () => {
    if (pinStr.length === 0) return;
    const newPinArr = [...pin];
    newPinArr[pinStr.length - 1] = '';
    setPin(newPinArr);
    setError('');
  };

  const processPin = async (entered: string) => {
    if (step === 'old') {
      const stored = await SecureStore.getItemAsync(PIN_KEY);
      if (stored === entered) {
        setPin(Array(PIN_LENGTH).fill(''));
        setStep('new');
      } else {
        setPin(Array(PIN_LENGTH).fill(''));
        setError('PIN incorrect');
        shake();
      }
      return;
    }

    if (step === 'new') {
      setNewPin(entered);
      setPin(Array(PIN_LENGTH).fill(''));
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (entered === newPin) {
        await SecureStore.setItemAsync(PIN_KEY, entered);
        Alert.alert(
          'PIN configuré',
          'Votre code PIN wallet a été enregistré avec succès.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        setPin(Array(PIN_LENGTH).fill(''));
        setError('Les PIN ne correspondent pas');
        shake();
      }
    }
  };

  const getTitle = () => {
    if (step === 'old') return 'Ancien code PIN';
    if (step === 'new') return isChange ? 'Nouveau code PIN' : 'Définir votre PIN';
    return 'Confirmer le PIN';
  };

  const getSubtitle = () => {
    if (step === 'old') return 'Saisissez votre code PIN actuel';
    if (step === 'new') return 'Choisissez un code à 4 chiffres';
    return 'Resaisissez le même code pour confirmer';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={12}
      >
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
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
});
