import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor() {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    this.configured = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
    if (this.configured) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
      });
      this.logger.log('✅ Cloudinary configuré — uploads vers le cloud activés');
    } else {
      this.logger.warn('⚠️ Cloudinary non configuré — stockage local utilisé');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  generateSignature(folder: string, _isVideo = false): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } {
    const timestamp = Math.round(Date.now() / 1000);

    // Upload simple sans eager (plan gratuit)
    const params: Record<string, unknown> = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!,
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      folder,
    };
  }

  async uploadImage(file: Express.Multer.File): Promise<{ secure_url: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'picpec/products' },
        (err: Error | undefined, result: { secure_url: string } | undefined) => {
          if (err) reject(err);
          else if (result) resolve(result);
          else reject(new Error('Upload failed'));
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadVideo(
    filePath: string,
    publicId?: string,
    folder = 'picpec/videos',
  ): Promise<{
    url: string;
    hlsUrl: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
  }> {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder,
      public_id: publicId ?? `post_${Date.now()}`,
      eager: [
        { streaming_profile: 'auto:maxres_720p', format: 'm3u8' },
        {
          transformation: [
            { width: 720, height: 1280, crop: 'fill' },
            { quality: 'auto', fetch_format: 'mp4' },
            { bit_rate: '1500k' },
            { video_codec: 'h264' },
          ],
          format: 'mp4',
        },
        {
          transformation: [
            { width: 480, height: 854, crop: 'fill' },
            { quality: 'auto:low', fetch_format: 'mp4' },
            { bit_rate: '800k' },
            { video_codec: 'h264' },
          ],
          format: 'mp4',
        },
        {
          resource_type: 'video',
          format: 'jpg',
          transformation: [
            { width: 720, height: 1280, crop: 'fill' },
            { start_offset: '1' },
            { quality: 'auto:low' },
            { fetch_format: 'webp' },
          ],
        },
      ],
      eager_async: false,
      quality: 'auto',
      fetch_format: 'auto',
    });

    const hlsResult = (result as { eager?: Array<{ format?: string; secure_url?: string }> }).eager?.find(
      (e: { format?: string }) => e.format === 'm3u8',
    );

    const hlsUrl =
      hlsResult?.secure_url ?? this.generateHlsUrl(result.public_id);

    const thumbnailUrl = cloudinary.url(result.public_id, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 720, height: 1280, crop: 'fill' },
        { start_offset: '1' },
        { quality: 'auto:low' },
        { fetch_format: 'auto' },
      ],
    });

    this.logger.log(`✅ Vidéo uploadée — HLS: ${hlsUrl}`);

    return {
      url: result.secure_url,
      hlsUrl,
      thumbnailUrl,
      duration: (result as { duration?: number }).duration ?? 0,
      width: result.width ?? 0,
      height: result.height ?? 0,
    };
  }

  generateHlsUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'm3u8',
      streaming_profile: 'auto:maxres_720p',
    });
  }

  async deleteVideo(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  }
}
