/**
 * Feed types — Cursor pagination, preload, monitoring
 */
import type { Post } from './index';

export interface FeedMeta {
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface FeedResponse {
  data: Post[];
  meta: FeedMeta;
}

export interface PreloadItem {
  post: Post;
  index: number;
}

export type ConnectionType = '2g' | '3g' | '4g' | 'wifi' | 'unknown';
export type VideoQuality = 'low' | 'medium' | 'high';
