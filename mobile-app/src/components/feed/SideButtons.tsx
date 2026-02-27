/**
 * SideButtons — Colonne droite TikTok
 * Avatar 52px + Follow, Like, Commentaires, Partager, Options
 * Icônes Ionicons, animation spring sur Like
 * PERF: props primitives pour éviter re-render quand post change
 */
import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Share,
  Animated,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { postsApi } from '../../api/posts.api';
import { formatCount } from '../../utils/formatCount';

interface SideButtonsProps {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  commentsCount: number;
  sharesCount?: number;
  isLiked: boolean;
  likeCount: number;
  isFollowing: boolean;
  onLike: () => void;
  onFollow: () => void;
  followLoading?: boolean;
}

function FollowButton({
  isFollowing,
  onFollow,
  followLoading,
}: {
  isFollowing: boolean;
  onFollow: () => void;
  followLoading: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(() => {
    if (followLoading) return;
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onFollow());
  }, [onFollow, followLoading, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.followBtn, isFollowing && styles.followBtnActive]}
      onPress={handlePress}
      disabled={followLoading}
    >
      <Animated.Text style={[styles.followBtnText, { transform: [{ rotate }] }]}>
        {isFollowing ? '✓' : '+'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

function LikeButton({
  isLiked,
  likeCount,
  onLike,
}: {
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const countTranslateY = useRef(new Animated.Value(0)).current;
  const countOpacity = useRef(new Animated.Value(1)).current;
  const prevLiked = useRef(isLiked);

  useEffect(() => {
    if (isLiked && !prevLiked.current) {
      countTranslateY.setValue(10);
      countOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(countTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(countOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevLiked.current = isLiked;
  }, [isLiked, countTranslateY, countOpacity]);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.35,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    onLike();
  }, [onLike, scale]);

  return (
    <View style={styles.action}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={36}
            color={isLiked ? '#FF2D55' : '#fff'}
          />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View
        style={{
          transform: [{ translateY: countTranslateY }],
          opacity: countOpacity,
        }}
      >
        <RNText style={styles.actionLabel}>{formatCount(likeCount)}</RNText>
      </Animated.View>
    </View>
  );
}

export const SideButtons = React.memo(function SideButtons({
  postId,
  authorId,
  authorName,
  authorAvatar,
  commentsCount,
  sharesCount: initialSharesCount = 0,
  isLiked,
  likeCount,
  isFollowing,
  onLike,
  onFollow,
  followLoading = false,
}: SideButtonsProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [sharesCount, setSharesCount] = React.useState(initialSharesCount ?? 0);

  React.useEffect(() => {
    setSharesCount(initialSharesCount ?? 0);
  }, [postId, initialSharesCount]);

  const initials = (authorName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleShare = useCallback(async () => {
    try {
      const result = await Share.share({
        message: `Regarde sur PicPec ! https://picpec.app/p/${postId}`,
        title: 'PICPEC',
      });
      if (result.action === Share.sharedAction) {
        setSharesCount((c) => c + 1);
        postsApi.share(postId).catch(() => setSharesCount((c) => Math.max(0, c - 1)));
      }
    } catch {
      /* silent */
    }
  }, [postId]);

  const handleComments = useCallback(() => {
    router.push(`/posts/${postId}/comments` as never);
  }, [postId]);

  const handleOptions = useCallback(() => {
    if (__DEV__) console.log('[SideButtons] Options:', postId);
  }, [postId]);

  return (
    <View style={styles.container}>
      {/* Avatar 52px + bordure blanche 2px + bouton Follow rond rouge 22px */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          {authorAvatar ? (
            <Image source={{ uri: authorAvatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        {currentUserId && authorId !== currentUserId && (
          <FollowButton
            isFollowing={isFollowing}
            onFollow={onFollow}
            followLoading={followLoading}
          />
        )}
      </View>

      {/* Like */}
      <LikeButton isLiked={isLiked} likeCount={likeCount} onLike={onLike} />

      {/* Commentaires */}
      <View style={styles.action}>
        <TouchableOpacity onPress={handleComments} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses-outline" size={36} color="#fff" />
        </TouchableOpacity>
        <RNText style={styles.actionLabel}>{formatCount(commentsCount)}</RNText>
      </View>

      {/* Partager + compteur */}
      <View style={styles.action}>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="paper-plane-outline" size={36} color="#fff" />
        </TouchableOpacity>
        <RNText style={styles.actionLabel}>{formatCount(sharesCount)}</RNText>
      </View>

      {/* Options */}
      <TouchableOpacity style={styles.action} onPress={handleOptions} activeOpacity={0.8}>
        <Ionicons name="ellipsis-horizontal" size={36} color="#fff" />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 10,
    bottom: 90,
    alignItems: 'center',
    gap: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E85D04',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  followBtn: {
    marginTop: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  followBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  action: { alignItems: 'center', gap: 4 },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
