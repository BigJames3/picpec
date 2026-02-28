/**
 * HomeScreen — Single Global Player Architecture
 *
 * Structure:
 *   HomeScreen
 *   ├── FlashList (PostCard = thumbnail only)
 *   └── GlobalVideoOverlay (1 VideoView, 1 useVideoPlayer)
 *
 * Préchargement: getAdaptiveVideoUrlForPost + prefetchVideoRange
 */
import { useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  ViewToken,
  ScrollView,
  Image,
} from 'react-native';
import {
  prefetchVideoRange,
  getAdaptiveVideoUrlForPost,
} from '../../src/utils/cloudinary.utils';
import { Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { useFeedStore } from '../../src/store/feed.store';
import { Post } from '../../src/types';
import { PostCard } from '../../src/components/feed/PostCard';
import { GlobalVideoOverlay } from '../../src/components/feed/GlobalVideoOverlay';
import { FeedSkeleton } from '../../src/components/feed/FeedSkeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { HeartBurst } from '../../src/components/feed/HeartBurst';
import { FeedFooterLoader } from '../../src/components/feed/FeedFooterLoader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const {
    posts,
    cursor,
    hasMore,
    isLoading,
    isRefreshing,
    fetchFeed,
    setActiveIndex,
    setScreenFocused,
    reset,
    heartBurst,
    resetAndFetch,
  } = useFeedStore();

  const flashListRef = useRef<FlashList<Post> | null>(null);
  const precomputedUrls = useRef<Map<string, string>>(new Map());
  const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TikTok-style: 50% visible pour scroll plus réactif
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 50,
  }).current;

  // Précalculer URL et préchauffer cache pour N posts suivants
  const preloadNextPosts = useCallback(async (currentIndex: number) => {
    const PRELOAD_COUNT = 2;

    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const post = posts[currentIndex + i];
      if (!post) continue;

      const videoUrl = post.videoUrl ?? '';
      const hlsUrl = post.hlsUrl ?? null;
      if (!videoUrl && !hlsUrl) continue;

      if (!precomputedUrls.current.has(post.id)) {
        try {
          const result = await getAdaptiveVideoUrlForPost(videoUrl, hlsUrl);
          precomputedUrls.current.set(post.id, result.streamUrl);
          useFeedStore.getState().setPrecomputedUrl(post.id, result.streamUrl);

          const delay = (i - 1) * 500;
          setTimeout(() => {
            prefetchVideoRange(result.streamUrl);
          }, delay);

          if (__DEV__) {
            console.log(
              `[Preload] Post +${i} préchauffé:`,
              result.streamUrl.slice(-40),
            );
          }
        } catch {
          /* ignore */
        }
      }

      const thumbUrl =
        post.thumbnailUrl ??
        (post.mediaType === 'image' ? post.imageUrl : null);
      if (thumbUrl) {
        Image.prefetch(thumbUrl).catch(() => {});
      }
    }
  }, [posts]);

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated || !accessToken) return;

      setScreenFocused(true);

      fetchFeed(null).then(() => {
        setActiveIndex(0);
        precomputedUrls.current.clear();
        setTimeout(() => {
          try {
            flashListRef.current?.scrollToIndex({
              index: 0,
              animated: false,
            });
          } catch {
            /* ignore si liste vide */
          }
        }, 500);
      });

      return () => setScreenFocused(false);
    }, [isHydrated, accessToken, fetchFeed, setScreenFocused, setActiveIndex]),
  );

  useEffect(() => {
    return () => {
      precomputedUrls.current.clear();
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const viewable = viewableItems.filter((item) => item.isViewable);
      if (viewable.length === 0) return;

      const mostVisible = viewable.reduce(
        (best, current) => {
          const bestPct =
            (best as ViewToken & { percentVisible?: number }).percentVisible ?? 0;
          const currentPct =
            (current as ViewToken & { percentVisible?: number }).percentVisible ?? 0;
          return currentPct > bestPct ? current : best;
        },
        viewable[0],
      );

      if (
        mostVisible?.index === undefined ||
        mostVisible.index === null
      )
        return;

      const newIndex = mostVisible.index;

      // Changer vidéo immédiatement
      setActiveIndex(newIndex);

      // Précharger avec délai (pas urgent)
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      preloadTimeoutRef.current = setTimeout(() => {
        preloadNextPosts(newIndex);
      }, 500);
    },
    [setActiveIndex, preloadNextPosts],
  );

  const getItemType = useCallback((item: Post) => {
    return item.mediaType === 'video' ? 'video' : 'image';
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <PostCard post={item} index={index} />
    ),
    [],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading && cursor) {
      fetchFeed(cursor);
    }
  }, [hasMore, isLoading, cursor, fetchFeed]);

  const handleRefresh = useCallback(() => {
    resetAndFetch().then(() => {
      setActiveIndex(0);
      precomputedUrls.current.clear();
      setTimeout(() => {
        try {
          flashListRef.current?.scrollToIndex({
            index: 0,
            animated: false,
          });
        } catch {
          /* ignore si liste vide */
        }
      }, 500);
    });
  }, [resetAndFetch, setActiveIndex]);

  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView
          pagingEnabled
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <FeedSkeleton count={3} />
        </ScrollView>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-post')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={flashListRef}
        data={posts}
        keyExtractor={(item: Post) => item.id.toString()}
        renderItem={renderItem}
        getItemType={getItemType}
        estimatedItemSize={SCREEN_HEIGHT}
        drawDistance={SCREEN_HEIGHT * 4}
        windowSize={3}
        removeClippedSubviews={true}
        pagingEnabled={true}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={handleEndReached}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListFooterComponent={
          isLoading && posts.length > 0 && hasMore ? (
            <FeedFooterLoader />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title="Aucune vidéo"
                subtitle="Soyez le premier à publier !"
                icon="🎬"
              />
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push('/create-post')}
              >
                <Text style={styles.createBtnText}>
                  + Créer le premier post
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <GlobalVideoOverlay />

      {/* FIX: HeartBurst en overlay plein écran (pageX/pageY) pour position correcte */}
      {heartBurst && (
        <View style={styles.heartBurstOverlay} pointerEvents="none">
          <HeartBurst x={heartBurst.x} y={heartBurst.y} />
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-post')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  createBtn: {
    marginTop: 16,
    backgroundColor: '#E85D04',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  fab: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E85D04',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 50,   // ← dépasse tout overlay
    zIndex: 50,      // ← ajouter
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  heartBurstOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 999,
  },
});
