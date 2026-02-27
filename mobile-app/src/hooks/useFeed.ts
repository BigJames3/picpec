/**
 * useFeed — Hook wrap du Zustand feed.store
 */
import { useCallback, useRef } from 'react';
import { useFeedStore } from '../store/feed.store';
import type { Post } from '../types';

export function useFeed() {
  const posts = useFeedStore((s) => s.posts);
  const isLoading = useFeedStore((s) => s.isLoading);
  const hasMore = useFeedStore((s) => s.hasMore);
  const fetchFeed = useFeedStore((s) => s.fetchFeed);
  const isFetching = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (isFetching.current || !hasMore || isLoading) return;
    isFetching.current = true;
    try {
      const cursor = useFeedStore.getState().cursor;
      await fetchFeed(cursor);
    } finally {
      isFetching.current = false;
    }
  }, [hasMore, isLoading, fetchFeed]);

  return { videos: posts, isLoading, hasMore, fetchNextPage };
}
