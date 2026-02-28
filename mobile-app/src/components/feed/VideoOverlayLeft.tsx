/**
 * VideoOverlayLeft — Overlay bas gauche TikTok
 * @username, description, 🎵 Vidéo originale
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const username = getUsername(post);

  const handleToggle = useCallback(() => {
    setDescriptionExpanded((e) => !e);
  }, []);

  const hasLongDescription = (post.description?.length ?? 0) > 80;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 1. @username */}
      <TouchableOpacity
        onPress={() => router.push(`/users/${post.user?.id}` as never)}
        activeOpacity={0.8}
      >
        <RNText style={styles.username}>{username}</RNText>
      </TouchableOpacity>

      {/* 2. Description */}
      {post.description ? (
        <RNText
          style={styles.description}
          numberOfLines={descriptionExpanded ? undefined : 2}
          ellipsizeMode="tail"
        >
          {post.description}
        </RNText>
      ) : null}

      {/* 3. Voir plus / Voir moins */}
      {hasLongDescription && (
        <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
          <RNText style={styles.seeMore}>
            {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
          </RNText>
        </TouchableOpacity>
      )}

      {/* 4. 🎵 Vidéo originale */}
      <View style={styles.mediaTypeRow}>
        <Ionicons
          name="musical-notes"
          size={12}
          color="rgba(255,255,255,0.7)"
        />
        <RNText style={styles.mediaTypeText}>Vidéo originale</RNText>
      </View>
    </View>
  );
};

export const VideoOverlayLeft = React.memo(
  VideoOverlayLeftComponent,
  (prev, next) => prev.post.id === next.post.id,
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 90,
    zIndex: 20,
    elevation: 20,
    gap: 6,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seeMore: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  mediaTypeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
});
