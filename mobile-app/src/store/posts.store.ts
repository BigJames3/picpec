import { create } from 'zustand';
import { Post } from '../types';
import { postsApi } from '../api/posts.api';

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface PostsState {
  posts: Post[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  cachedAt: number | null;
  retryCount: number;
  isRetrying: boolean;
  fetchFeed: (
    pageNum?: number,
    reset?: boolean,
    options?: { forceRefresh?: boolean }
  ) => Promise<void>;
}

function parseFeedResponse(data: unknown): { posts: Post[]; meta: { total?: number; hasNextPage?: boolean } } {
  const d = data as { data?: Post[]; posts?: Post[]; meta?: { total?: number; hasNextPage?: boolean } };
  const posts = (
    d?.data ??
    d?.posts ??
    (Array.isArray(data) ? (data as Post[]) : [])
  );
  const meta = d?.meta ?? {};
  return { posts, meta };
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  page: 1,
  hasMore: true,
  isLoading: true,
  isRefreshing: false,
  isLoadingMore: false,
  cachedAt: null,
  retryCount: 0,
  isRetrying: false,

  fetchFeed: async (pageNum = 1, reset = false, options?: { forceRefresh?: boolean }) => {
    const state = get();
    const { posts, cachedAt, isLoading, retryCount } = state;
    const forceRefresh = options?.forceRefresh ?? false;

    if (!forceRefresh && reset && posts.length > 0 && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
      set({ isLoading: false, isRefreshing: false });
      return;
    }

    if (isLoading && !reset) return;

    if (retryCount >= 3) {
      if (__DEV__) console.warn('[Feed] Max retries atteint — arrêt');
      set({ isLoading: false, isRetrying: false });
      return;
    }

    if (forceRefresh) set({ retryCount: 0 });

    set({
      isLoading: true,
      isRefreshing: reset,
      isLoadingMore: pageNum > 1,
    });

    try {
      const { data } = await postsApi.getFeed({ page: pageNum, limit: 5 });
      const { posts: newPosts, meta } = parseFeedResponse(data as unknown);

      set((s) => ({
        posts: reset ? newPosts : [...s.posts, ...newPosts],
        page: pageNum,
        hasMore: meta?.hasNextPage ?? (pageNum * 5 < (meta?.total ?? 0)),
        cachedAt: Date.now(),
        retryCount: 0,
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
      }));
    } catch (e) {
      if (__DEV__) console.warn('[Feed] Erreur fetch:', e);

      const newRetryCount = get().retryCount + 1;
      const delay = Math.min(1000 * 2 ** newRetryCount, 30000);

      set({
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        retryCount: newRetryCount,
      });

      if (newRetryCount < 3) {
        if (__DEV__) console.warn(`[Feed] Retry ${newRetryCount}/3 dans ${delay}ms`);
        setTimeout(() => {
          get().fetchFeed(pageNum, reset, options);
        }, delay);
      }
    }
  },
}));
