/**
 * PostCard — Interface feed TikTok/Instagram Reels
 *
 * Boutons d'actions à droite, infos utilisateur en bas à gauche,
 * dégradés pour lisibilité, animations.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Share,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Post } from '../../types';
import { useFeedStore } from '../../store/feed.store';
import { useAuthStore } from '../../store/auth.store';
import { getWebPImageUrl } from '../../utils/cloudinary.utils';
import { postsApi } from '../../api/posts.api';
import { formatCount } from '../../utils/formatCount';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DOUBLE_TAP_DELAY = 300;

interface Props {
  post: Post;
  index: number;
}

const PostCardComponent = ({ post, index }: Props) => {
  const activeIndex = useFeedStore((s) => s.activeIndex);
  const isMuted = useFeedStore((s) => s.isMuted);
  const setMuted = useFeedStore((s) => s.setMuted);
  const togglePause = useFeedStore((s) => s.togglePause);
  const likePost = useFeedStore((s) => s.likePost);
  const setHeartBurst = useFeedStore((s) => s.setHeartBurst);
  const updatePostFollowing = useFeedStore((s) => s.updatePostFollowing);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const lastTapRef = useRef<number>(0);
  const isLikingRef = useRef(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const pauseOpacity = useRef(new Animated.Value(0)).current;

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isPausedVisible, setIsPausedVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount ?? 0);
  const [isFollowing, setIsFollowing] = useState(post.isFollowing ?? false);
  const [followLoading, setFollowLoading] = useState(false);

  const isActive = activeIndex === index;

  const hasVideo = !!post.videoUrl && post.mediaType !== 'image';
  const hasImage = post.mediaType === 'image' && !!post.imageUrl;
  const imageSource = post.imageUrl;
  const optimizedImageUrl = imageSource ? getWebPImageUrl(imageSource) : null;

  const thumbnailUrl =
    post.thumbnailUrl ?? (post.mediaType === 'image' ? post.imageUrl : null);
  const displayImageUrl =
    hasImage && (optimizedImageUrl ?? imageSource)
      ? (optimizedImageUrl ?? imageSource) ?? ''
      : thumbnailUrl;

  const authorName =
    post.user?.fullname ?? post.user?.fullName ?? post.user?.name ?? 'U';
  const authorHandle = authorName.toLowerCase().replace(/\s+/g, '');
  const avatarUri =
    post.user?.avatarUrl ??
    post.user?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=E85D04&color=fff`;

  useEffect(() => {
    setIsLiked(post.isLiked ?? false);
    setLikes(post.likesCount ?? 0);
    setSharesCount(post.sharesCount ?? 0);
    setIsFollowing(post.isFollowing ?? false);
  }, [post.id, post.isLiked, post.likesCount, post.sharesCount, post.isFollowing]);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        postsApi.recordView(post.id).catch(() => {});
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, post.id]);

  const showPauseIndicator = useCallback(() => {
    setIsPausedVisible(true);
    pauseOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(pauseOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setIsPausedVisible(false));
  }, [pauseOpacity]);

  const handleLike = useCallback(async () => {
    if (isLikingRef.current) return;
    isLikingRef.current = true;

    const prevLiked = isLiked;
    const prevCount = likes;
    setIsLiked(!prevLiked);
    setLikes(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.35,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await likePost(post.id);
    } catch {
      setIsLiked(prevLiked);
      setLikes(prevCount);
    } finally {
      isLikingRef.current = false;
    }
  }, [post.id, likePost, isLiked, likes, likeScale]);

  const handleMediaPress = useCallback(
    (e: GestureResponderEvent) => {
      const now = Date.now();
      const ev = e.nativeEvent as {
        pageX?: number;
        pageY?: number;
        locationX?: number;
        locationY?: number;
      };
      const x = ev.pageX ?? ev.locationX ?? 0;
      const y = ev.pageY ?? ev.locationY ?? 0;

      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        if (!isLiked) handleLike();
        setHeartBurst({ x, y });
        setTimeout(() => setHeartBurst(null), 900);
      } else if (hasVideo && isActive) {
        togglePause();
        showPauseIndicator();
      }
      lastTapRef.current = now;
    },
    [
      handleLike,
      isLiked,
      hasVideo,
      isActive,
      togglePause,
      setHeartBurst,
      showPauseIndicator,
    ],
  );

  const handleMuteToggle = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  const handleShare = useCallback(async () => {
    try {
      const result = await Share.share({
        message: `Regarde sur PicPec ! https://picpec.app/p/${post.id}`,
        title: 'PICPEC',
      });
      if (result.action === Share.sharedAction) {
        setSharesCount((c) => c + 1);
        postsApi.share(post.id).catch(() =>
          setSharesCount((c) => Math.max(0, c - 1)),
        );
      }
    } catch {
      /* silent */
    }
  }, [post.id]);

  const handleFollow = useCallback(async () => {
    if (!post.user?.id || followLoading || post.user.id === currentUserId)
      return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await postsApi.unfollow(post.user.id);
        setIsFollowing(false);
        updatePostFollowing(post.id, false);
      } else {
        await postsApi.follow(post.user.id);
        setIsFollowing(true);
        updatePostFollowing(post.id, true);
      }
    } catch {
      /* silent */
    } finally {
      setFollowLoading(false);
    }
  }, [post.id, post.user?.id, isFollowing, followLoading, currentUserId, updatePostFollowing]);

  return (
    <View style={styles.container}>
      {/* ── MÉDIA (vidéo ou image) ── */}
      <TouchableWithoutFeedback onPress={handleMediaPress}>
        <View style={styles.mediaContainer}>
          {displayImageUrl ? (
            <Image
              source={{ uri: displayImageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.placeholder,
                {
                  backgroundColor: `hsl(${
                    (post.id.charCodeAt(0) * 47) % 360
                  }, 55%, 18%)`,
                },
              ]}
            >
              <Text style={styles.placeholderEmoji}>🎬</Text>
              <Text style={styles.placeholderText}>Média en cours…</Text>
            </View>
          )}

          {/* Indicateur pause au centre — vidéo uniquement */}
          {hasVideo && isPausedVisible && (
            <Animated.View
              style={[styles.pauseIndicator, { opacity: pauseOpacity }]}
              pointerEvents="none"
            >
              <Ionicons
                name="pause"
                size={64}
                color="rgba(255,255,255,0.9)"
              />
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* ── DÉGRADÉ BAS ── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradientBottom}
        pointerEvents="none"
      />

      {/* ── DÉGRADÉ HAUT ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        style={styles.gradientTop}
        pointerEvents="none"
      />

      {/* ── BOUTONS DROITE (style TikTok) ── */}
      <View style={styles.sideActions}>
        {/* Avatar utilisateur */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {currentUserId && post.user?.id !== currentUserId && (
            <TouchableOpacity
              style={[styles.followBadge, isFollowing && styles.followBadgeActive]}
              onPress={handleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFollowing ? 'checkmark' : 'add'}
                size={12}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleLike}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={34}
              color={isLiked ? '#ff2d55' : '#fff'}
            />
          </Animated.View>
          <Text style={styles.actionCount}>{formatCount(likes)}</Text>
        </TouchableOpacity>

        {/* Commentaire */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/posts/${post.id}/comments` as never)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={32}
            color="#fff"
          />
          <Text style={styles.actionCount}>
            {formatCount(post.commentsCount ?? 0)}
          </Text>
        </TouchableOpacity>

        {/* Partager */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-redo-outline" size={32} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(sharesCount)}</Text>
        </TouchableOpacity>

        {/* Mute — repositionné en bas de la colonne */}
        {hasVideo && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleMuteToggle}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ── INFOS BAS GAUCHE ── */}
      <View style={styles.bottomInfo}>
        {/* Nom utilisateur */}
        <TouchableOpacity
          onPress={() => router.push(`/users/${post.user?.id}` as never)}
          activeOpacity={0.8}
        >
          <Text style={styles.username}>@{authorHandle}</Text>
        </TouchableOpacity>

        {/* Description */}
        {post.description ? (
          <Text
            style={styles.description}
            numberOfLines={descriptionExpanded ? 10 : 2}
          >
            {post.description}
          </Text>
        ) : null}

        {/* Voir plus */}
        {post.description && post.description.length > 80 && (
          <TouchableOpacity
            onPress={() => setDescriptionExpanded((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.seeMore}>
              {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Musique / type de média */}
        <View style={styles.mediaTypeRow}>
          <Ionicons
            name={hasVideo ? 'musical-notes' : 'image-outline'}
            size={12}
            color="rgba(255,255,255,0.7)"
          />
          <Text style={styles.mediaTypeText}>
            {hasVideo ? 'Vidéo originale' : 'Photo'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const PostCard = React.memo(PostCardComponent);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },

  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    zIndex: 1,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },

  pauseIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
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
    marginLeft: -10,
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

  bottomInfo: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 90,
    zIndex: 10,
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

  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: { fontSize: 56, marginBottom: 12 },
  placeholderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
