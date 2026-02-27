/**
 * FeedFooterLoader — Indicateur discret pendant fetchNextPage
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function FeedFooterLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
