/**
 * Feed API — Cursor-based pagination
 *
 * Backend: GET /posts?cursor=lastPostId&limit=10
 * Response: { data: Post[], meta: { nextCursor, hasMore } }
 */
import api from './client';
import { Post } from '../types';
import type { FeedMeta, FeedResponse } from '../types/feed.types';

export type { FeedMeta, FeedResponse };

export const feedApi = {
  getFeed: async (params: {
    cursor?: string | null;
    limit?: number;
  }): Promise<FeedResponse> => {
    const limit = params.limit ?? 10;
    const queryParams: Record<string, string | number> = { limit };
    if (params.cursor) queryParams.cursor = params.cursor;

    const { data } = await api.get<{
      data?: Post[];
      meta?: { nextCursor?: string | null; hasMore?: boolean; hasNextPage?: boolean };
    }>('/posts', { params: queryParams });

    const posts = data?.data ?? [];
    const meta = data?.meta ?? {};
    const hasMore = meta.hasMore ?? meta.hasNextPage ?? false;

    return {
      data: posts,
      meta: {
        nextCursor: hasMore ? (meta.nextCursor ?? null) : null,
        hasMore,
      },
    };
  },
};
