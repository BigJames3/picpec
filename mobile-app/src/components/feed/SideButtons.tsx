/**
 * SideButtons — Colonne droite TikTok
 * Avatar 52px + Follow, Like, Commentaires, Partager, Mute
 * Icônes Ionicons, animation spring sur Like
 */
import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Share,
  Animated,
  Image,
} from 'react-native';
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
  isMuted?: boolean;
  onMuteToggle?: () => void;
}

function FollowBadge({
  isFollowing,
  onFollow,
  followLoading,
  show,
}: {
  isFollowing: boolean;
  onFollow: () => void;
  followLoading: boolean;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <TouchableOpacity
      style={[styles.followBadge, isFollowing && styles.followBadgeActive]}
      onPress={onFollow}
      disabled={followLoading}
      activeOpacity={0.8}
    >
      <Ionicons
        name={isFollowing ? 'checkmark' : 'add'}
        size={12}
        color="#fff"
      />
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
    <TouchableOpacity style={styles.actionBtn} onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={34}
          color={isLiked ? '#ff2d55' : '#fff'}
        />
      </Animated.View>
      <RNText style={styles.actionCount}>{formatCount(likeCount)}</RNText>
    </TouchableOpacity>
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
  isMuted = false,
  onMuteToggle,
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

  return (
    <View style={styles.container}>
      {/* 1. Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{
            uri:
              (authorAvatar && authorAvatar.trim()) ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=E85D04&color=fff`,
          }}
          style={styles.avatar}
        />
        <FollowBadge
          show={!!(currentUserId && authorId !== currentUserId)}
          isFollowing={isFollowing}
          onFollow={onFollow}
          followLoading={followLoading}
        />
      </View>

      {/* 2. Like */}
      <LikeButton isLiked={isLiked} likeCount={likeCount} onLike={onLike} />

      {/* 3. Commentaires */}
      <TouchableOpacity style={styles.actionBtn} onPress={handleComments} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses-outline" size={32} color="#fff" />
        <RNText style={styles.actionCount}>{formatCount(commentsCount)}</RNText>
      </TouchableOpacity>

      {/* 4. Partager */}
      <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
        <Ionicons name="arrow-redo-outline" size={32} color="#fff" />
        <RNText style={styles.actionCount}>Partager</RNText>
      </TouchableOpacity>

      {/* 5. Mute */}
      {onMuteToggle && (
        <TouchableOpacity style={styles.actionBtn} onPress={onMuteToggle} activeOpacity={0.8}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
    zIndex: 20,
    elevation: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#fff',
  },
  followBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    transform: [{ translateX: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E85D04',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  followBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
