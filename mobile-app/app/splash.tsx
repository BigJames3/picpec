import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { theme } from '../src/theme';

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const token = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  useEffect(() => {
    if (!isHydrated) return;
    const t = setTimeout(() => {
      if (token) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [isHydrated, token]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Text style={styles.logo}>🟠</Text>
        <Text style={styles.title}>PICPEC</Text>
        <Text style={styles.tagline}>Ta finance, ta communauté</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: theme.typography.size['4xl'],
    fontWeight: 'bold',
    color: theme.colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: theme.typography.size.lg,
    color: theme.colors.primaryMuted,
    marginTop: 12,
  },
});
