import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function FeedSkeletonItem() {
  return (
    <View style={styles.container}>
      <View style={styles.mediaPlaceholder} />
      <View style={styles.avatar} />
      <View style={styles.line1} />
      <View style={styles.line2} />
      <View style={styles.actions} />
    </View>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <FeedSkeletonItem key={`skeleton-${i}`} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: SCREEN_HEIGHT,
    backgroundColor: '#111',
  },
  mediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2a2a2a',
  },
  line1: {
    position: 'absolute',
    bottom: 96,
    left: 70,
    width: 120,
    height: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  line2: {
    position: 'absolute',
    bottom: 76,
    left: 70,
    width: 80,
    height: 12,
    backgroundColor: '#252525',
    borderRadius: 4,
  },
  actions: {
    position: 'absolute',
    bottom: 96,
    right: 12,
    width: 40,
    height: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
});
