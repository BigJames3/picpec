/**
 * VideoPlayer — Lecteur adaptatif HLS/MP4
 *
 * Résolution URL une seule fois, timeUpdateEventInterval 0.5
 */
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  getAdaptiveVideoUrlForPost,
  type NetworkType,
} from '../../utils/cloudinary.utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
  videoUrl: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  preload?: boolean;
  isMuted?: boolean;
  onMuteToggle?: () => void;
}

export interface VideoPlayerRef {
  togglePause: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoUrl,
      hlsUrl,
      thumbnailUrl,
      isActive,
      preload = false,
      isMuted = false,
    },
    ref,
  ) {
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [streamUrl, setStreamUrl] = useState('');
    const [, setNetworkType] = useState<NetworkType>('4g');
    const urlResolvedRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const thumbnailOpacity = useRef(new Animated.Value(1)).current;
    const videoOpacity = useRef(new Animated.Value(0)).current;

    // Résoudre URL UNE SEULE FOIS au montage
    useEffect(() => {
      if (urlResolvedRef.current || !videoUrl) return;
      let cancelled = false;

      async function resolveUrl() {
        const result = await getAdaptiveVideoUrlForPost(videoUrl, hlsUrl ?? null);
        if (cancelled) return;

        urlResolvedRef.current = true;
        setStreamUrl(result.streamUrl);
        setNetworkType(result.network);

        if (__DEV__) {
          console.log(
            `[VideoPlayer] ${result.isHls ? '🚀 HLS' : '📹 MP4'} — Réseau: ${result.network}`,
          );
        }
      }

      resolveUrl();
      return () => {
        cancelled = true;
      };
    }, [videoUrl, hlsUrl]);

    const shouldLoad = (isActive || preload) && !!streamUrl;
    const player = useVideoPlayer(
      shouldLoad ? { uri: streamUrl } : null,
      (p) => {
        p.loop = true;
        p.muted = true;
      },
    );

    useImperativeHandle(
      ref,
      () => ({
        togglePause: () => setIsPaused((p) => !p),
      }),
      [],
    );

    // timeUpdateEventInterval réduit
    useEffect(() => {
      if (!player) return;
      try {
        (player as { timeUpdateEventInterval?: number }).timeUpdateEventInterval = 0.5;
      } catch {
        /* ignore */
      }
    }, [player]);

    const handleVideoReady = useCallback(() => {
      setIsReady(true);
      Animated.parallel([
        Animated.timing(thumbnailOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(videoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, [thumbnailOpacity, videoOpacity]);

    // Play/Pause UNIQUEMENT
    useEffect(() => {
      if (!player) return;

      if (!isActive) {
        try {
          player.pause();
        } catch {
          /* ignore */
        }
        return;
      }

      const timer = setTimeout(() => {
        try {
          if (!isPaused) player.play();
        } catch (e) {
          if (__DEV__) console.warn('[VideoPlayer] Erreur play:', e);
        }
      }, 50);

      return () => clearTimeout(timer);
    }, [isActive, player, isPaused]);

    // Mute UNIQUEMENT
    useEffect(() => {
      if (!player) return;

      if (!isActive) {
        try {
          player.muted = true;
        } catch {
          /* ignore */
        }
        return;
      }

      try {
        player.muted = isMuted ?? false;
      } catch {
        /* ignore */
      }
    }, [isActive, player, isMuted]);

    // Cleanup au démontage
    useEffect(() => {
      return () => {
        if (player) {
          try {
            player.pause();
            player.muted = true;
          } catch {
            /* ignore */
          }
        }
      };
    }, [player]);

    useEffect(() => {
      if (!player) return;
      const sub = player.addListener('statusChange', (status: { status?: string }) => {
        if (status.status === 'readyToPlay') {
          handleVideoReady();
        }
        if (status.status === 'error') {
          setHasError(true);
        }
      });
      return () => sub.remove();
    }, [player, handleVideoReady]);

    useEffect(() => {
      if (!player || !isActive) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      intervalRef.current = setInterval(() => {
        try {
          const current =
            (player as { currentTime?: number }).currentTime ?? 0;
          const total = (player as { duration?: number }).duration ?? 0;
          if (total > 0) setProgress(current / total);
        } catch {
          /* ignore */
        }
      }, 500);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [isActive, player]);

    if (hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>❌ Vidéo indisponible</Text>
        </View>
      );
    }

    if (!streamUrl && !hlsUrl && !videoUrl) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>🎬 Vidéo en cours…</Text>
        </View>
      );
    }

    if (!player) {
      return (
        <View style={styles.container}>
          {thumbnailUrl && (
            <Image
              source={{ uri: thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
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
        </View>

        {isPaused && isActive && (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <Text style={styles.pauseIcon}>⏸</Text>
          </View>
        )}

        <View style={styles.progressBar} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pauseIcon: { fontSize: 52, color: '#fff' },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    position: 'absolute',
    top: '48%',
    alignSelf: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#E85D04',
    minWidth: 2,
  },
});
