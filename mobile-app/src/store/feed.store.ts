/**
 * Feed Store — Single Global Player + Network-aware preload
 *
 * - activeIndex, cursor, hasMore
 * - Predictive preload: ring buffer, cancel outdated
 * - 2G: thumbnail only. 3G/4G/WiFi: thumbnails + HEAD
 * - LRU cache for preloaded URLs (max 20)
 */
import { create } from 'zustand';
import { Image } from 'react-native';
import { Post } from '../types';
import { feedApi } from '../api/feed.api';
import { postsApi } from '../api/posts.api';
import { getConnectionType } from '../utils/network.utils';
import { preloadCache } from '../utils/lru-cache';

const PRELOAD_COUNT = 3;
const FEED_LIMIT = 10;
const PRELOAD_URL_MAX = 20;

export interface FeedState {
  posts: Post[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  activeIndex: number;
  isMuted: boolean;
  isPaused: boolean;
  isScreenFocused: boolean;
  lastFetchAt: number;
  precomputedStreamUrls: Record<string, string>;

  setActiveIndex: (index: number) => void;
  setPrecomputedUrl: (postId: string, url: string) => void;
  setMuted: (muted: boolean) => void;
  togglePause: () => void;
  setScreenFocused: (focused: boolean) => void;
  fetchFeed: (cursor?: string | null) => Promise<void>;
  preloadNext: () => void;
  reset: () => void;
  updatePostLiked: (postId: string, isLiked: boolean, likesCount: number) => void;
  updatePostFollowing: (postId: string, isFollowing: boolean) => void;
  likePost: (postId: string) => Promise<void>;
  heartBurst: { x: number; y: number } | null;
  setHeartBurst: (pos: { x: number; y: number } | null) => void;
  resetAndFetch: () => Promise<void>;
}

let preloadAbort: AbortController | null = null;

const initialState = {
  posts: [] as Post[],
  cursor: null as string | null,
  hasMore: true,
  isLoading: true,
  isRefreshing: false,
  activeIndex: 0,
  isMuted: false,
  isPaused: false,
  isScreenFocused: true,
  lastFetchAt: 0,
  precomputedStreamUrls: {} as Record<string, string>,
};

const initialHeartBurst = null as { x: number; y: number } | null;

export const useFeedStore = create<FeedState>((set, get) => ({
  ...initialState,
  heartBurst: initialHeartBurst,

  setActiveIndex: (index) => {
    preloadAbort?.abort();
    preloadAbort = new AbortController();
    set({ activeIndex: index, isPaused: false });
    get().preloadNext();
  },

  setMuted: (muted) => set({ isMuted: muted }),

  setPrecomputedUrl: (postId, url) =>
    set((s) => ({
      precomputedStreamUrls: {
        ...s.precomputedStreamUrls,
        [postId]: url,
      },
    })),

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  setScreenFocused: (focused) =>
    set({
      isScreenFocused: focused,
      // Garder activeIndex intact
      // GlobalVideoOverlay gère lui-même
      // l'affichage selon isScreenFocused
    }),

  fetchFeed: async (cursor = null) => {
    const isInitial = !cursor;

    if (isInitial) {
      const now = Date.now();
      const lastFetch = get().lastFetchAt ?? 0;
      if (now - lastFetch < 2000 && get().posts.length > 0) {
        if (__DEV__) console.log('[Feed] Skip double fetch');
        return;
      }
      set({
        isLoading: true,
        isRefreshing: true,
        lastFetchAt: now,
      });
    } else if (get().isLoading) {
      return;
    } else {
      set({ isLoading: true });
    }

    try {
      const { data, meta } = await feedApi.getFeed({
        cursor: cursor ?? undefined,
        limit: FEED_LIMIT,
      });

      if (__DEV__ && isInitial && data.length > 0) {
        console.log('[Feed] Premier post reçu:', data[0]?.id, data[0]?.createdAt);
        console.log('[Feed] Nombre de posts:', data.length);
      }

      const sorted =
        isInitial && data.length > 0
          ? [...data].sort(
              (a, b) =>
                new Date(b.createdAt ?? 0).getTime() -
                new Date(a.createdAt ?? 0).getTime(),
            )
          : data;

      set((s) => ({
        posts: isInitial ? sorted : [...s.posts, ...data],
        cursor: meta.nextCursor ?? null,
        hasMore: meta.hasMore ?? false,
        isLoading: false,
        isRefreshing: false,
        activeIndex: isInitial ? 0 : s.activeIndex,
        isPaused: false,
        isScreenFocused: isInitial ? true : s.isScreenFocused,
      }));

      if (isInitial && sorted.length > 0) {
        get().preloadNext();
      }
    } catch (e) {
      if (__DEV__) console.warn('[Feed] fetchFeed error:', e);
      set({ isLoading: false, isRefreshing: false });
    }
  },

  preloadNext: async () => {
    const { posts, activeIndex } = get();
    const signal = preloadAbort?.signal;
    if (signal?.aborted) return;

    const conn = await getConnectionType();
    const is2G = conn === '2g' || conn === 'unknown';

    const toPreload: Post[] = [];
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const post = posts[activeIndex + i];
      if (post) toPreload.push(post);
    }

    for (const post of toPreload) {
      if (signal?.aborted) break;

      const thumbUrl =
        post.thumbnailUrl ??
        (post.mediaType === 'image' ? post.imageUrl : null);
      if (thumbUrl && !preloadCache.has(thumbUrl)) {
        preloadCache.set(thumbUrl, true);
        Image.prefetch(thumbUrl).catch(() => {});
      }

      if (is2G) continue;

      const videoUrl = post.hlsUrl ?? post.videoUrl;
      if (videoUrl && !preloadCache.has(videoUrl)) {
        preloadCache.set(videoUrl, true);
        fetch(videoUrl, { method: 'HEAD', signal }).catch(() => {});
      }
    }

    if (preloadCache.size > PRELOAD_URL_MAX) {
      preloadCache.clear();
    }
  },

  reset: () => {
    preloadAbort?.abort();
    preloadAbort = null;
    preloadCache.clear();
    set({
      ...initialState,
      heartBurst: initialHeartBurst,
      precomputedStreamUrls: {},
      // NE PAS forcer isScreenFocused false ici
      // NE PAS forcer activeIndex -1 ici
      // Ce sera géré par setScreenFocused()
    });
  },

  updatePostLiked: (postId, isLiked, likesCount) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, isLiked, likesCount } : p,
      ),
    })),

  updatePostFollowing: (postId, isFollowing) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, isFollowing } : p,
      ),
    })),

  setHeartBurst: (pos) => set({ heartBurst: pos }),

  resetAndFetch: async () => {
    set({
      posts: [],
      cursor: null,
      hasMore: true,
      isLoading: true,
      isRefreshing: true,
      activeIndex: 0,
      isScreenFocused: true,
      isPaused: false,
      lastFetchAt: 0,
      precomputedStreamUrls: {},
    });
    await get().fetchFeed(null);
  },

  likePost: async (postId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked ?? false;
    const prevCount = post.likesCount ?? 0;
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !wasLiked, likesCount: wasLiked ? prevCount - 1 : prevCount + 1 }
          : p,
      ),
    }));
    try {
      if (wasLiked) await postsApi.unlike(postId);
      else await postsApi.like(postId);
    } catch {
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId ? { ...p, isLiked: wasLiked, likesCount: prevCount } : p,
        ),
      }));
    }
  },
}));

/** Derived: active post for GlobalVideoOverlay */
export function useActivePost(): Post | null {
  const posts = useFeedStore((s) => s.posts);
  const activeIndex = useFeedStore((s) => s.activeIndex);
  if (activeIndex < 0 || activeIndex >= posts.length) return null;
  return posts[activeIndex] ?? null;
}
