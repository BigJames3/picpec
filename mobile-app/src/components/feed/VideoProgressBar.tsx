/**
 * VideoProgressBar — Barre de progression TikTok
 * Position: bottom 0, height 3, fond rgba(255,255,255,0.25)
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VideoProgressBarProps {
  currentTime: number;
  duration: number;
}

export const VideoProgressBar = React.memo(function VideoProgressBar({
  currentTime,
  duration,
}: VideoProgressBarProps) {
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.fill, { width: `${progress * 100}%` }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  fill: {
    height: 3,
    backgroundColor: '#fff',
    minWidth: 2,
  },
});
