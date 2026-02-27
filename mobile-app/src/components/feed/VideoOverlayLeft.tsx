/**
 * VideoOverlayLeft — Overlay bas gauche TikTok
 * @username, description (max 2 lignes + toggle), 🎵 son avec animation défilement
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text as RNText, TouchableOpacity, Animated } from 'react-native';
import { Post } from '../../types';

interface VideoOverlayLeftProps {
  post: Post;
}

const getUsername = (post: Post) => {
  const name =
    (post.user as { username?: string })?.username ??
    post.user?.fullName ??
    post.user?.fullname ??
    post.user?.name ??
    'user';
  return '@' + String(name).replace(/\s+/g, '_').toLowerCase();
};

const VideoOverlayLeftComponent = function VideoOverlayLeft({
  post,
}: VideoOverlayLeftProps) {
  const [expanded, setExpanded] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const username = getUsername(post);
  const soundName = (post as { soundName?: string }).soundName ?? 'Son original';

  const handleToggle = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  const hasLongDescription = (post.description?.length ?? 0) > 80;

  // FIX: Animated.loop stoppé au unmount pour éviter memory leak
  useEffect(() => {
    translateX.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: -80,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [translateX]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <RNText style={styles.username}>{username}</RNText>

      {!!post.description && (
        <View>
          <RNText
            style={styles.description}
            numberOfLines={expanded ? undefined : 2}
            ellipsizeMode="tail"
          >
            {post.description}
          </RNText>
          {hasLongDescription && (
            <TouchableOpacity onPress={handleToggle} hitSlop={8}>
              <RNText style={styles.voirPlus}>
                {expanded ? 'voir moins' : '... voir plus'}
              </RNText>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.soundRow}>
        <RNText style={styles.soundIcon}>🎵</RNText>
        <Animated.View style={[styles.soundWrap, { transform: [{ translateX }] }]}>
          <RNText style={styles.soundName} numberOfLines={1}>
            {soundName}
          </RNText>
        </Animated.View>
      </View>
    </View>
  );
};

// PERF: memo avec comparaison sur post.id pour éviter re-render pendant lecture
export const VideoOverlayLeft = React.memo(
  VideoOverlayLeftComponent,
  (prev, next) => prev.post.id === next.post.id,
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 80,
  },
  username: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  voirPlus: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 8,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  soundIcon: { fontSize: 12 },
  soundWrap: { flex: 1 },
  soundName: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
