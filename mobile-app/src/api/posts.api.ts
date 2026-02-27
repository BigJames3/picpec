import axios from 'axios';
import api from './client';
import { Post, PaginatedResult } from '../types';

const EXT_TO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  m4v: 'video/x-m4v',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  ogv: 'video/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

function getMimeType(uri: string, assetType?: string): string {
  if (assetType === 'video') return 'video/mp4';
  if (assetType === 'image') return 'image/jpeg';

  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];

  return uri.includes('video') ? 'video/mp4' : 'image/jpeg';
}

async function getUploadSignature(type: 'video' | 'image') {
  const res = await api.get('/posts/upload-signature', {
    params: { type },
  });
  return res.data as {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
    eager?: string;
    eagerAsync?: string;
  };
}

async function uploadToCloudinary(
  uri: string,
  type: 'video' | 'image',
  mimeType: string,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; hlsUrl?: string }> {
  try {
    const sig = await getUploadSignature(type);
    console.log('[Cloudinary] Signature OK:', sig.cloudName, sig.folder);

    const formData = new FormData();
    const filename = uri.split('/').pop() ?? `file.${type === 'video' ? 'mp4' : 'jpg'}`;

    formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);
    formData.append('api_key',   sig.apiKey);
    formData.append('timestamp', String(sig.timestamp));
    formData.append('signature', sig.signature);
    formData.append('folder', sig.folder);

    if (type === 'video') {
      formData.append('resource_type', 'video');
    }

    // Désactivé eager (plan gratuit Cloudinary)
    // if (sig.eager) {
    //   formData.append('eager', sig.eager);
    // }
    // if (sig.eagerAsync) {
    //   formData.append('eager_async', sig.eagerAsync);
    // }

    if (type === 'image' && /heic|heif/i.test(uri)) {
      formData.append('format', 'jpg');
    }

    const resourceType = type === 'video' ? 'video' : 'image';
    const cloudUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;
    
    console.log('[Cloudinary] Upload vers:', cloudUrl);

    const response = await axios.post(cloudUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          const percent = Math.round((e.loaded * 100) / e.total);
          console.log(`[Cloudinary] Progression: ${percent}%`);
          onProgress(percent);
        }
      },
    });

    const data = response.data;

    if (__DEV__) {
      console.log('[Cloudinary] Réponse:', {
        secure_url: data?.secure_url,
        public_id: data?.public_id,
        error: data?.error,
      });
    }

    if (!data?.secure_url) {
      throw new Error(
        data?.error?.message ?? 'Cloudinary: pas de secure_url',
      );
    }

    const url: string = data.secure_url;
    let hlsUrl: string | undefined;

    if (type === 'video') {
      const hlsEager = data.eager?.find(
        (e: { format?: string }) => e.format === 'm3u8',
      );

      if (hlsEager?.secure_url) {
        hlsUrl = hlsEager.secure_url;
      } else if (data.public_id) {
        const cloudName = sig.cloudName;
        hlsUrl =
          `https://res.cloudinary.com/${cloudName}` +
          `/video/upload/sp_auto:maxres_720p` +
          `/${data.public_id}.m3u8`;
      } else {
        hlsUrl = url
          .replace('/upload/', '/upload/sp_auto:maxres_720p/')
          .replace(/\.(mp4|mov|webm|avi|mkv)$/i, '.m3u8');
      }
      console.log('[Cloudinary] HLS URL:', hlsUrl);
    }

    console.log('[Cloudinary] ✅ Upload réussi:', url);
    return { url, hlsUrl };

  } catch (err: any) {
    const isJsError = !err?.response;
    console.error('[Cloudinary] ❌ Erreur:', {
      jsError:  isJsError ? err?.message : undefined,
      status:   err?.response?.status,
      message:  err?.response?.data?.error?.message,
      code:     err?.code,
    });
    throw err;
  }
}

export const postsApi = {
  getFeed: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResult<Post>>('/posts', { params }),

  getById: (id: string) => api.get<Post>(`/posts/${id}`),

  create: async (data: {
    description: string;
    videoUri?: string;
    imageUri?: string;
    thumbnailUri?: string;
    mediaType: 'video' | 'image';
    onProgress?: (percent: number) => void;
  }) => {
    let videoUrl: string | undefined;
    let imageUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    console.log('[API] Upload Cloudinary — mediaType:', data.mediaType);

    let hlsUrl: string | undefined;

    if (data.mediaType === 'image' && data.imageUri) {
      const mimeType = getMimeType(data.imageUri, 'image');
      const result = await uploadToCloudinary(
        data.imageUri,
        'image',
        mimeType,
        data.onProgress,
      );
      imageUrl = result.url;
      console.log('[API] imageUrl Cloudinary:', imageUrl);
    } else if (data.videoUri) {
      const mimeType = getMimeType(data.videoUri, 'video');
      const result = await uploadToCloudinary(
        data.videoUri,
        'video',
        mimeType,
        data.onProgress,
      );
      videoUrl = result.url;
      hlsUrl = result.hlsUrl;
      console.log('[API] videoUrl Cloudinary:', videoUrl);
      console.log('[API] hlsUrl Cloudinary:', hlsUrl);

      if (data.thumbnailUri) {
        const thumbMime = getMimeType(data.thumbnailUri, 'image');
        const thumbResult = await uploadToCloudinary(
          data.thumbnailUri,
          'image',
          thumbMime,
        );
        thumbnailUrl = thumbResult.url;
      }
    }

    return api.post<Post>('/posts', {
      description: data.description,
      videoUrl,
      hlsUrl,
      imageUrl,
      thumbnailUrl,
      mediaType: data.mediaType,
    });
  },

  like: (id: string) => api.post(`/posts/${id}/like`),
  unlike: (id: string) => api.delete(`/posts/${id}/like`),

  follow: (userId: string) =>
    api.post(`/posts/users/${userId}/follow`).then((r) => r.data),

  unfollow: (userId: string) =>
    api.delete(`/posts/users/${userId}/follow`).then((r) => r.data),

  delete: (id: string) => api.delete(`/posts/${id}`),

  report: (postId: string, reason: string, details?: string) =>
    api.post(`/posts/${postId}/report`, { reason, details }).then((r) => r.data),

  recordView: (postId: string, duration?: number) =>
    api.post(`/posts/${postId}/view`, { duration }),

  share: (postId: string) =>
    api.post(`/posts/${postId}/share`).then((r) => r.data),

  getComments: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/posts/${id}/comments`, { params }),
  addComment: (id: string, content: string) =>
    api.post(`/posts/${id}/comment`, { content }),
};
