import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { theme } from '../src/theme';
import { PButton } from '../src/components/ui/PButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🌍',
    title: 'La finance africaine réinventée',
    desc: 'Gérez votre argent, participez à des tontines et découvrez les produits locaux',
    bg: ['#E85D04', '#C04A00'],
  },
  {
    id: '2',
    emoji: '🤝',
    title: 'Tontines digitales',
    desc: 'Rejoignez des groupes d\'épargne solidaire, payez vos cotisations et recevez votre tour',
    bg: ['#1D4ED8', '#1E3A8A'],
  },
  {
    id: '3',
    emoji: '🛒',
    title: 'Marketplace local',
    desc: 'Achetez et vendez des produits locaux en toute sécurité avec paiement intégré',
    bg: ['#16A34A', '#14532D'],
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      router.replace('/login');
    }
  };

  const goPrev = () => {
    if (index > 0) {
      const prev = index - 1;
      flatRef.current?.scrollToIndex({ index: prev, animated: true });
      setIndex(prev);
    }
  };

  const skip = () => router.replace('/login');

  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(i);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={skip}>
        <Text style={styles.skipText}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.slide,
              {
                width: SCREEN_WIDTH,
                backgroundColor: item.bg[0],
              },
            ]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {index > 0 && (
          <PButton
            label="Précédent"
            onPress={goPrev}
            variant="outline"
            style={{ marginRight: 12, flex: 1 }}
          />
        )}
        <PButton
          label={index === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
          onPress={goNext}
          style={{ flex: index > 0 ? 1 : 2 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
  },
  skipText: { color: theme.colors.white, fontSize: 16, fontWeight: '600' },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    fontSize: theme.typography.size.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: theme.colors.white, width: 24 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
});
