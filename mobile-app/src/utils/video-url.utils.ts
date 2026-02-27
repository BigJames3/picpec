/**
 * Adaptive video URL — MP4 priorité (plan gratuit Cloudinary)
 * HLS uniquement si généré par eager réel (plan payant)
 */

/**
 * Retourne la meilleure URL vidéo :
 * - HLS réel (eager Cloudinary) → si disponible
 * - MP4 direct → toujours valide
 *
 * @param hlsUrl  URL HLS (.m3u8) — peut être null
 * @param videoUrl URL MP4 — peut être null
 */
export async function getAdaptiveVideoUrlForPost(
  hlsUrl:   string | null | undefined,
  videoUrl: string | null | undefined,
): Promise<string | null> {
  const mp4 = videoUrl ?? null;
  const hls = hlsUrl   ?? null;

  if (!mp4 && !hls) return null;

  // Ignorer HLS construit manuellement (plan gratuit)
  const isManualHls = hls?.includes('sp_auto:maxres_720p');

  if (hls && !isManualHls) return hls;
  if (mp4) return mp4;
  return hls ?? null;
}
