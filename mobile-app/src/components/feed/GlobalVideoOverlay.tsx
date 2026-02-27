/**
 * GlobalVideoOverlay — Single Global Player + UI TikTok
 *
 * VideoView, VideoProgressBar, VideoOverlayLeft, SideButtons
 * Listener timeUpdate pour progression
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  Text,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFeedStore, useActivePost } from '../../store/feed.store';
import { postsApi } from '../../api/posts.api';
import { VideoProgressBar } from './VideoProgressBar';
import { VideoOverlayLeft } from './VideoOverlayLeft';
import { SideButtons } from './SideButtons';
import {
  onBufferingStart,
  onBufferingEnd,
  onFirstFrame,
  onError,
  flushMetrics,
} from '../../utils/monitoring';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function GlobalVideoOverlay() {
  const activePost = useActivePost();
  const isMuted = useFeedStore((s) => s.isMuted);
  const isPaused = useFeedStore((s) => s.isPaused);
  const isScreenFocused = useFeedStore((s) => s.isScreenFocused);
  const updatePostLiked = useFeedStore((s) => s.updatePostLiked);
  const updatePostFollowing = useFeedStore((s) => s.updatePostFollowing);
  const loadStartedAt = useRef<number>(0);
  const thumbnailOpacity = useRef(new Animated.Value(1)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');

  const hasVideo =
    activePost &&
    (activePost.hlsUrl ?? activePost.videoUrl) &&
    activePost.mediaType !== 'image';
  const thumbnailUrl = activePost?.thumbnailUrl ?? null;

  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    if (activePost) {
      setIsLiked(activePost.isLiked ?? false);
      setLikeCount(activePost.likesCount ?? 0);
      setIsFollowing(activePost.isFollowing ?? false);
    }
  }, [activePost?.id, activePost?.isLiked, activePost?.likesCount, activePost?.isFollowing]);

  // Résoudre streamUrl quand activePost change
  useEffect(() => {
    if (!hasVideo || !activePost) {
      setStreamUrl('');
      return;
    }

    const hls = activePost.hlsUrl  ?? null;
    const mp4 = activePost.videoUrl ?? null;

    if (!hls && !mp4) {
      setStreamUrl('');
      return;
    }

    // HLS manuel sp_auto:maxres_720p = invalide plan gratuit
    const isManualHls = hls?.includes('sp_auto:maxres_720p');

    // MP4 priorité — toujours valide
    const finalUri = (!isManualHls && hls) ? hls : (mp4 ?? hls ?? '');

    if (__DEV__) {
      console.log(
        finalUri === hls && !isManualHls
          ? '[GlobalOverlay] 🚀 HLS réel:'
          : '[GlobalOverlay] 📹 MP4:',
        finalUri?.slice(-40),
      );
    }

    if (finalUri) setStreamUrl(finalUri);

  }, [hasVideo, activePost?.id,
      activePost?.hlsUrl, activePost?.videoUrl]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[GlobalOverlay] activePost changed:', {
        id: activePost?.id,
        hlsUrl: activePost?.hlsUrl?.slice(-40),
        videoUrl: activePost?.videoUrl?.slice(-40),
        mediaType: activePost?.mediaType,
        isScreenFocused,
        streamUrl: streamUrl?.slice(-40),
      });
    }
  }, [activePost?.id, activePost?.hlsUrl, activePost?.videoUrl, activePost?.mediaType, isScreenFocused, streamUrl]);

  const replaceAndPlay = useCallback(async () => {
    if (!player || !streamUrl) return;

    loadStartedAt.current = Date.now();
    thumbnailOpacity.setValue(1);
    videoOpacity.setValue(0);
    setCurrentTime(0);
    setDuration(0);

    const replacePlayer = player as unknown as {
      replaceAsync: (s: { uri: string }) => Promise<void>;
    };

    try {
      if (__DEV__) {
        console.log('[GlobalOverlay] replaceAndPlay:', streamUrl.slice(-50));
      }
      await replacePlayer.replaceAsync({ uri: streamUrl });

      player.muted = isMuted;
      if (!isPaused) {
        player.play();
        if (__DEV__) console.log('[GlobalOverlay] ▶️ Lecture démarrée');
      }
    } catch (err) {
      if (__DEV__) console.warn('[GlobalOverlay] Erreur replaceAndPlay:', err);
      onError(activePost?.id ?? '', err instanceof Error ? err.message : String(err));
      setTimeout(() => {
        try {
          if (!isPaused && player) {
            player.play();
          }
        } catch {
          /* ignore */
        }
      }, 200);
    }
  }, [player, streamUrl, isMuted, isPaused, thumbnailOpacity, videoOpacity, activePost?.id]);

  useEffect(() => {
    if (!isScreenFocused || !hasVideo || !streamUrl) {
      try {
        player?.pause();
        player.muted = true;
      } catch {
        /* ignore */
      }
      return;
    }

    const timer = setTimeout(() => {
      replaceAndPlay();
    }, 150);

    return () => clearTimeout(timer);
  }, [isScreenFocused, hasVideo, activePost?.id, streamUrl, replaceAndPlay]);

  useEffect(() => {
    if (!player || !hasVideo) return;
    player.muted = isMuted;
    if (isPaused) player.pause();
    else player.play();
  }, [player, isMuted, isPaused, hasVideo]);

  // FIX: listener timeUpdate nettoyé au unmount pour éviter memory leak
  useEffect(() => {
    if (!player) return;

    const unsub = player.addListener('timeUpdate', (e: { currentTime?: number }) => {
      const ct = e.currentTime ?? (player as { currentTime?: number }).currentTime ?? 0;
      const dur = (player as { duration?: number }).duration ?? 0;
      setCurrentTime(ct);
      setDuration(dur);
    });
    return () => unsub.remove();
  }, [player]);

  useEffect(() => {
    if (!player) return;

    const subStatus = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        onFirstFrame(activePost!.id, loadStartedAt.current);
        Animated.parallel([
          Animated.timing(thumbnailOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(videoOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        if (isScreenFocused && hasVideo && !isPaused) {
          try {
            player.muted = isMuted;
            player.play();
            if (__DEV__) console.log('[GlobalOverlay] ✅ Auto-play readyToPlay');
          } catch {
            /* ignore */
          }
        }
      }
      if (status.status === 'error') {
        const errMsg =
          status.error != null
            ? typeof status.error === 'object' && status.error && 'message' in status.error
              ? (status.error as { message?: string }).message
              : String(status.error)
            : 'statusChange:error';
        onError(activePost?.id ?? '', errMsg ?? '');
      }
    });

    const subPlaying = player.addListener?.(
      'playingChange',
      (ev: { isPlaying?: boolean }) => {
        if (ev.isPlaying) onBufferingEnd(activePost?.id ?? '');
      },
    );

    const subError = (
      player as {
        addListener?: (e: string, cb: (ev: unknown) => void) => { remove: () => void };
      }
    ).addListener?.('error', (ev: unknown) => {
      onError(
        activePost?.id ?? '',
        typeof ev === 'object' && ev && 'message' in ev
          ? String((ev as { message: string }).message)
          : 'unknown',
      );
    });

    return () => {
      subStatus.remove();
      subPlaying?.remove?.();
      subError?.remove?.();
    };
  }, [player, activePost?.id, thumbnailOpacity, videoOpacity, isScreenFocused, hasVideo, isPaused, isMuted]);

  useEffect(() => {
    return () => {
      try {
        player?.pause();
        player.muted = true;
      } catch {
        /* ignore */
      }
      flushMetrics();
    };
  }, [player]);

  const isLikingRef = useRef(false);

  const handleLike = useCallback(async () => {
    if (!activePost) return;
    // FIX: ignore double-tap rapide pendant requête API (race condition)
    if (isLikingRef.current) return;
    isLikingRef.current = true;

    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    updatePostLiked(activePost.id, !prevLiked, prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (prevLiked) {
        await postsApi.unlike(activePost.id);
      } else {
        await postsApi.like(activePost.id);
      }
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      updatePostLiked(activePost.id, prevLiked, prevCount);
    } finally {
      isLikingRef.current = false;
    }
  }, [activePost, isLiked, likeCount, updatePostLiked]);

  const handleFollow = useCallback(async () => {
    if (!activePost || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await postsApi.unfollow(activePost.user.id);
        setIsFollowing(false);
        updatePostFollowing(activePost.id, false);
      } else {
        await postsApi.follow(activePost.user.id);
        setIsFollowing(true);
        updatePostFollowing(activePost.id, true);
      }
    } catch (e) {
      if (__DEV__) console.error(e);
    } finally {
      setFollowLoading(false);
    }
  }, [activePost, isFollowing, followLoading, updatePostFollowing]);

  if (!hasVideo || !isScreenFocused) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <VideoProgressBar
        currentTime={currentTime}
        duration={duration}
      />

      {isPaused && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <Text style={styles.pauseIcon}>⏸</Text>
        </View>
      )}

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
        pointerEvents="none"
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>

      {thumbnailUrl && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: thumbnailOpacity }]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </Animated.View>
      )}

      {activePost && (
        <>
          <VideoOverlayLeft post={activePost} />
          <SideButtons
            postId={activePost.id}
            authorId={activePost.user.id}
            authorName={
              activePost.user?.fullName ??
              activePost.user?.fullname ??
              activePost.user?.name ??
              'Utilisateur'
            }
            authorAvatar={
              activePost.user?.avatarUrl ??
              activePost.user?.avatar
            }
            commentsCount={activePost.commentsCount}
            sharesCount={activePost.sharesCount ?? 0}
            isLiked={isLiked}
            likeCount={likeCount}
            isFollowing={isFollowing}
            onLike={handleLike}
            onFollow={handleFollow}
            followLoading={followLoading}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 1,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 2,
  },
  pauseIcon: { fontSize: 52, color: '#fff' },
});
