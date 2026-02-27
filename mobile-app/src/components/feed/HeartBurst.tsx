/**
 * HeartBurst — Animation double-tap TikTok
 * Opacity 0→1→0, scale 0.5→1.3→1 en 900ms, démontage auto
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface HeartBurstProps {
  x: number;
  y: number;
}

export const HeartBurst = React.memo(function HeartBurst({ x, y }: HeartBurstProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    scale.setValue(0.5);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [x, y, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - 50,
          top: y - 50,
          transform: [{ scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.heart}>❤️</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  heart: { fontSize: 80 },
});
