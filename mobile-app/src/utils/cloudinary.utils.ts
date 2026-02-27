/**
 * Cloudinary utils — Adaptive video URLs, network-aware
 *
 * HLS auto:maxres_720p, MP4 fallbacks 720p/480p
 * Cache LRU des URLs résolues
 */
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import type { VideoQuality } from './network.utils';

// Types réseau
export type NetworkType = 'wifi' | '4g' | '3g' | '2g' | 'slow';

// Cache LRU des URLs résolues
const urlCache = new Map<
  string,
  {
    hlsUrl: string;
    mp4Url: string;
    mp4LowUrl: string;
    network: NetworkType;
    cachedAt: number;
  }
>();
const URL_CACHE_TTL = 5 * 60 * 1000; // 5 min
const URL_CACHE_MAX = 50; // 50 entrées max

// Compatibilité : getNetworkQuality (alias pour VideoPlayer)
export async function getNetworkQuality(): Promise<VideoQuality> {
  const type = await getNetworkType();
  if (type === 'wifi' || type === '4g') return 'high';
  if (type === '3g') return 'medium';
  return 'low';
}

// Détecter le type réseau précis
export async function getNetworkType(): Promise<NetworkType> {
  const state = await NetInfo.fetch();

  if (!state.isConnected) return 'slow';

  switch (state.type) {
    case NetInfoStateType.wifi:
      return 'wifi';
    case NetInfoStateType.cellular: {
      const gen = (state.details as { cellularGeneration?: string })
        ?.cellularGeneration;
      if (gen === '5g' || gen === '4g') return '4g';
      if (gen === '3g') return '3g';
      return '2g';
    }
    default:
      return '3g';
  }
}

// Résultat complet pour getAdaptiveVideoUrlForPost
export interface AdaptiveVideoResult {
  streamUrl: string;
  isHls: boolean;
  mp4Url: string;
  mp4LowUrl: string;
  network: NetworkType;
}

// Générer toutes les URLs pour un post (signature: videoUrl, hlsUrl?)
export async function getAdaptiveVideoUrlForPost(
  videoUrl: string,
  hlsUrl?: string | null,
): Promise<AdaptiveVideoResult> {
  // Vérifier cache
  const cached = urlCache.get(videoUrl);
  if (cached && Date.now() - cached.cachedAt < URL_CACHE_TTL) {
    const network = await getNetworkType();
    const useHls = network !== '2g' && network !== 'slow';
    return {
      streamUrl: useHls ? cached.hlsUrl : cached.mp4LowUrl,
      isHls: useHls,
      mp4Url: cached.mp4Url,
      mp4LowUrl: cached.mp4LowUrl,
      network,
    };
  }

  const network = await getNetworkType();
  const isCloudinary = videoUrl.includes('cloudinary.com');

  let resolvedHls = hlsUrl ?? '';
  let resolvedMp4 = videoUrl;
  let resolvedMp4Low = videoUrl;

  if (isCloudinary) {
    const base = videoUrl.split('/upload/')[0] + '/upload/';
    const pubId = videoUrl
      .split('/upload/')[1]
      ?.replace(/\.[^.]+$/, '');

    if (pubId) {
      resolvedHls =
        resolvedHls || `${base}sp_auto:maxres_720p/${pubId}.m3u8`;

      resolvedMp4 = `${base}vc_h264,w_720,h_1280,c_fill,q_auto,br_1500k,f_mp4/${pubId}.mp4`;

      resolvedMp4Low = `${base}vc_h264,w_480,h_854,c_fill,q_auto:low,br_800k,f_mp4/${pubId}.mp4`;
    }
  }

  const useHls = network !== '2g' && network !== 'slow';
  const streamUrl = useHls
    ? resolvedHls || resolvedMp4
    : resolvedMp4Low;

  if (urlCache.size >= URL_CACHE_MAX) {
    const firstKey = urlCache.keys().next().value;
    if (firstKey) urlCache.delete(firstKey);
  }
  urlCache.set(videoUrl, {
    hlsUrl: resolvedHls,
    mp4Url: resolvedMp4,
    mp4LowUrl: resolvedMp4Low,
    network,
    cachedAt: Date.now(),
  });

  if (__DEV__) {
    console.log(
      `[Adaptive] Réseau: ${network} → ${useHls ? '🚀 HLS' : '📹 MP4'}`,
    );
  }

  return {
    streamUrl,
    isHls: useHls,
    mp4Url: resolvedMp4,
    mp4LowUrl: resolvedMp4Low,
    network,
  };
}

/** Compatibilité video-url.utils : (hlsUrl, videoUrl) => streamUrl */
export async function getAdaptiveVideoUrlForPostCompat(
  hlsUrl: string | null | undefined,
  videoUrl: string | null | undefined,
): Promise<string | null> {
  const video = videoUrl ?? '';
  if (!video && !hlsUrl) return null;
  const result = await getAdaptiveVideoUrlForPost(video, hlsUrl ?? undefined);
  return result.streamUrl || null;
}

// Compatibilité : getAdaptiveVideoUrl pour video-url.utils
export function getAdaptiveVideoUrl(
  originalUrl: string,
  quality: VideoQuality,
): string {
  if (!originalUrl.includes('cloudinary.com')) return originalUrl;

  const transformMap: Record<VideoQuality, string> = {
    low: 'vc_h264,w_480,h_854,c_fill,q_auto:low,br_800k,f_mp4',
    medium: 'vc_h264,w_720,h_1280,c_fill,q_auto,br_1500k,f_mp4',
    high: 'vc_h264,w_720,h_1280,c_fill,q_auto,br_1500k,f_mp4',
  };
  const transform = transformMap[quality];
  return originalUrl.replace('/upload/', `/upload/${transform}/`);
}

// WebP optimisé pour images
export function getWebPImageUrl(url: string): string {
  if (!url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/f_webp,q_auto,w_720/');
}

// Préchauffer cache OS — fetch Range bytes=0-524287
export async function prefetchVideoRange(url: string): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-524287' },
    });
    if (__DEV__) {
      console.log('[Prefetch] ✅ Range chauffé:', url.slice(-40));
    }
  } catch {
    /* silencieux */
  }
}
