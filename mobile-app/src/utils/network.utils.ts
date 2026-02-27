/**
 * Network-aware utils — 2G/3G/4G/WiFi detection
 *
 * Cached 30s to avoid NetInfo.fetch() spam.
 * Drives adaptive quality: 2G=low, 3G=medium, 4G/WiFi=high.
 */
import NetInfo from '@react-native-community/netinfo';

export type ConnectionType = '2g' | '3g' | '4g' | 'wifi' | 'unknown';
export type VideoQuality = 'low' | 'medium' | 'high';

let cached: { type: ConnectionType; quality: VideoQuality } | null = null;
let cacheExpiry = 0;
const CACHE_MS = 30_000;

export async function getConnectionType(): Promise<ConnectionType> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return 'unknown';

  if (state.type === 'wifi') return 'wifi';

  if (state.type === 'cellular') {
    const gen = (state.details as { cellularGeneration?: string })
      ?.cellularGeneration;
    if (gen === '4g' || gen === '5g') return '4g';
    if (gen === '3g') return '3g';
    return '2g';
  }

  return 'unknown';
}

/** Cached. 2G→low, 3G→medium, 4G/WiFi→high */
export async function getVideoQuality(): Promise<VideoQuality> {
  if (cached && Date.now() < cacheExpiry) return cached.quality;

  const type = await getConnectionType();
  const quality: VideoQuality =
    type === 'wifi' || type === '4g'
      ? 'high'
      : type === '3g'
        ? 'medium'
        : 'low';

  cached = { type, quality };
  cacheExpiry = Date.now() + CACHE_MS;
  return quality;
}

/** Invalidate cache (e.g. on app resume) */
export function invalidateNetworkCache(): void {
  cached = null;
  cacheExpiry = 0;
}
