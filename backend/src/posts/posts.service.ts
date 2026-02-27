import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CloudinaryService } from './cloudinary.service';
import { appConfig } from '../common/config/app.config';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  private async convertHeicToJpeg(filePath: string): Promise<string> {
    const lower = filePath.toLowerCase();
    if (!lower.endsWith('.heic') && !lower.endsWith('.heif')) {
      return filePath;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp');
      const outputPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');
      await sharp(filePath).jpeg({ quality: 85 }).toFile(outputPath);
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      this.logger.log(`[Convert] HEIC → JPEG: ${outputPath}`);
      return outputPath;
    } catch (err) {
      this.logger.warn('[Convert] sharp non disponible, HEIC conservé:', err);
      return filePath;
    }
  }

  private async generateThumbnail(videoPath: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ffmpeg = require('fluent-ffmpeg');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      ffmpeg.setFfmpegPath(ffmpegPath);

      const thumbPath = videoPath.replace(/\.[^.]+$/, '_thumb.jpg');
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: path.basename(thumbPath),
            folder: path.dirname(thumbPath),
            size: '640x?',
          })
          .on('end', () => resolve(thumbPath))
          .on('error', reject);
      });
    } catch {
      return null;
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    userId: string,
    dto: CreatePostDto & {
      videoUrl?: string;
      hlsUrl?: string;
      imageUrl?: string;
      mediaType?: string;
      thumbnailUrl?: string;
      duration?: number;
      videoPath?: string;
      imagePath?: string;
      thumbnailPath?: string;
    },
  ) {
    this.logger.log(
      '[create] Données reçues: ' +
        JSON.stringify({
          videoUrl: dto.videoUrl,
          hlsUrl: dto.hlsUrl,
          imageUrl: dto.imageUrl,
          mediaType: dto.mediaType,
          thumbnailUrl: dto.thumbnailUrl,
        }),
    );

    let videoUrl = dto.videoUrl ?? null;
    let hlsUrl = dto.hlsUrl ?? null;
    let imageUrl = dto.imageUrl ?? null;
    let thumbnailUrl = dto.thumbnailUrl ?? null;
    let duration = dto.duration ?? null;

    // CAS 1 — Upload direct Cloudinary (mobile)
    const hasCloudinaryUrls =
      (videoUrl && videoUrl.includes('cloudinary.com')) ||
      (imageUrl && imageUrl.includes('cloudinary.com'));

    if (hasCloudinaryUrls) {
      this.logger.log('[create] URLs Cloudinary reçues — sauvegarde directe');
    }
    // CAS 2 — Upload multipart local (admin/backend)
    else if (
      this.cloudinaryService.isConfigured() &&
      dto.videoPath &&
      fs.existsSync(dto.videoPath)
    ) {
      this.logger.log('[create] Fichier local — upload Cloudinary');
      try {
        const result = await this.cloudinaryService.uploadVideo(
          dto.videoPath,
          `post_${Date.now()}`,
        );
        videoUrl = result.url;
        hlsUrl = result.hlsUrl;
        thumbnailUrl = result.thumbnailUrl;
        duration = result.duration ?? null;

        fs.unlink(dto.videoPath, (err) => {
          if (err)
            this.logger.warn(
              'Could not delete local file: ' + dto.videoPath,
            );
        });
      } catch (err) {
        this.logger.error('Cloudinary upload failed', err);
      }
    }

    // CAS 3 — Image locale (HEIC conversion)
    if (
      dto.imagePath &&
      fs.existsSync(dto.imagePath) &&
      !hasCloudinaryUrls
    ) {
      const lower = dto.imagePath.toLowerCase();
      if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
        try {
          const converted = await this.convertHeicToJpeg(dto.imagePath);
          imageUrl =
            `${appConfig.baseUrl}/uploads/` + path.basename(converted);
        } catch {
          imageUrl = dto.imageUrl ?? null;
        }
      } else {
        imageUrl = dto.imageUrl ?? null;
      }
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        videoUrl,
        hlsUrl,
        imageUrl,
        mediaType: dto.mediaType ?? null,
        thumbnailUrl,
        duration,
        description: dto.description ?? null,
      },
      include: {
        user: {
          select: { id: true, fullname: true, avatarUrl: true },
        },
      },
    });

    this.logger.log(
      '[create] Post créé: ' +
        JSON.stringify({
          id: post.id,
          videoUrl: post.videoUrl,
          hlsUrl: post.hlsUrl,
          mediaType: post.mediaType,
        }),
    );

    return post;
  }

  async findById(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, fullname: true, avatarUrl: true },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async findAll(
    page = 1,
    limit = 20,
    userId?: string,
    cursor?: string,
  ) {
    const [viewedPostIds, following] = await Promise.all([
      userId
        ? this.prisma.postView.findMany({
            where: { userId },
            select: { postId: true },
            orderBy: { watchedAt: 'desc' },
            take: 100,
          })
        : [],
      userId
        ? this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          })
        : [],
    ]);
    const viewedIds = viewedPostIds.map((v) => v.postId);
    const followingSet = new Set(following.map((f) => f.followingId));

    const orderBy = [
      { likesCount: 'desc' as const },
      { viewsCount: 'desc' as const },
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ];

    // Sélection explicite pour éviter l'overfetch (url, thumbnail, likes, comments, etc.)
    const baseFind = {
      take: limit,
      orderBy,
      select: {
        id: true,
        userId: true,
        videoUrl: true,
        hlsUrl: true,
        imageUrl: true,
        mediaType: true,
        thumbnailUrl: true,
        duration: true,
        description: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        sharesCount: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullname: true,
            avatarUrl: true,
            followersCount: true,
          },
        },
        likes:
          userId !== undefined
            ? { where: { userId }, select: { id: true } }
            : { where: { userId: 'none' }, select: { id: true } },
      },
    };

    const [posts, total] = await Promise.all([
      cursor
        ? this.prisma.post.findMany({
            ...baseFind,
            skip: 1,
            cursor: { id: cursor },
          })
        : this.prisma.post.findMany({
            ...baseFind,
            skip: (page - 1) * limit,
          }),
      this.prisma.post.count(),
    ]);

    const enriched = posts.map((post) => {
      const { likes, ...rest } = post;
      const likesArr = Array.isArray(likes) ? likes : [];
      const score =
        (followingSet.has(post.userId) ? 1000 : 0) +
        (post.likesCount ?? 0) * 2 +
        (post.viewsCount ?? 0);
      return {
        ...rest,
        ...(rest.user && 'followersCount' in rest.user
          ? { user: rest.user }
          : { user: { ...(rest.user && typeof rest.user === 'object' ? rest.user : {}), followersCount: 0 } }),
        isLiked: userId ? likesArr.length > 0 : false,
        isFollowing: userId ? followingSet.has(post.userId) : false,
        isViewed: viewedIds.includes(post.id),
        score,
      };
    });

    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return paginate(enriched, total, cursor ? 1 : page, limit, {
      cursorBased: !!cursor,
    });
  }

  async like(postId: string, userId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      return { liked: true, alreadyLiked: true };
    }

    const [, post] = await this.prisma.$transaction([
      this.prisma.postLike.create({
        data: { postId, userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { liked: true, likesCount: post.likesCount };
  }

  async unlike(postId: string, userId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Like introuvable');
    }

    const [, post] = await this.prisma.$transaction([
      this.prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return post;
  }

  async comment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          postId,
          userId,
          content: dto.content,
        },
        include: {
          user: {
            select: { id: true, fullname: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  async remove(postId: string, userId: string, role: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post introuvable');

    const isAdminOrAbove = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    if (post.userId !== userId && !isAdminOrAbove) {
      throw new ForbiddenException('Action non autorisée');
    }

    await this.prisma.post.delete({ where: { id: postId } });
    return { message: 'Post supprimé' };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Impossible de se suivre soi-même');
    }
    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
    if (existing) {
      throw new ConflictException('Déjà abonné');
    }
    await this.prisma.$transaction([
      this.prisma.follow.create({ data: { followerId, followingId } }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { increment: 1 } },
      }),
    ]);
    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
    if (!existing) {
      throw new NotFoundException('Abonnement introuvable');
    }
    await this.prisma.$transaction([
      this.prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { decrement: 1 } },
      }),
    ]);
    return { success: true };
  }

  async reportPost(
    userId: string,
    postId: string,
    reason: string,
    details?: string,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post introuvable');

    const validReasons = ['SPAM', 'VIOLENCE', 'INAPPROPRIATE', 'OTHER'];
    if (!validReasons.includes(reason)) {
      throw new BadRequestException('Raison invalide');
    }

    return this.prisma.report.upsert({
      where: { postId_userId: { postId, userId } },
      update: { reason, details },
      create: { postId, userId, reason, details },
    });
  }

  async incrementShare(postId: string, _userId: string | null) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post introuvable');

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { sharesCount: { increment: 1 } },
      select: { id: true, sharesCount: true },
    });
    return updated;
  }

  async recordView(postId: string, userId: string | null, duration?: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post introuvable');

    await this.prisma.$transaction([
      this.prisma.postView.create({
        data: { postId, userId, duration },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { viewsCount: { increment: 1 } },
      }),
    ]);
    return { success: true };
  }

  async getComments(postId: string, pagination: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = pagination;
    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { postId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullname: true, avatarUrl: true } },
        },
      }),
      this.prisma.comment.count({ where: { postId } }),
    ]);
    return paginate(comments, total, page, limit);
  }

  /** Méthode temporaire de debug — liste les posts avec videoUrl incorrecte (.jpeg) */
  async fixBadVideoUrls(): Promise<void> {
    const posts = await this.prisma.post.findMany({
      where: {
        videoUrl: { contains: '.jpeg' },
      },
    });
    console.log(`[Fix] ${posts.length} posts avec videoUrl incorrecte`);
    for (const post of posts) {
      console.log(`[Fix] Post ${post.id} — videoUrl: ${post.videoUrl}`);
    }
  }

  /** Corrige les videoUrl contenant localhost → IP du PC */
  async fixVideoUrls(): Promise<{ fixed: number }> {
    const posts = await this.prisma.post.findMany({
      where: { videoUrl: { contains: 'localhost' } },
    });

    for (const post of posts) {
      const fixed =
        post.videoUrl?.replace('http://localhost:3000', appConfig.baseUrl) ??
        post.videoUrl;
      await this.prisma.post.update({
        where: { id: post.id },
        data: { videoUrl: fixed },
      });
    }

    console.log(`[Fix] ${posts.length} posts corrigés (localhost → ${appConfig.baseUrl})`);
    return { fixed: posts.length };
  }

  async convertExistingVideosToHls(): Promise<{ converted: number }> {
    const posts = await this.prisma.post.findMany({
      where: {
        videoUrl: { not: null },
        hlsUrl: null,
        mediaType: 'video',
      },
    });

    this.logger.log(`[HLS] ${posts.length} vidéos à convertir`);

    for (const post of posts) {
      try {
        if (!post.videoUrl) continue;

        const afterUpload = post.videoUrl.split('/upload/')[1];
        if (!afterUpload) continue;
        const withoutExt = afterUpload.replace(/\.[^.]+$/, '');
        const publicId = withoutExt.replace(/^v\d+\//, '');

        if (!publicId) continue;

        const hlsUrl = this.cloudinaryService.generateHlsUrl(publicId);

        await this.prisma.post.update({
          where: { id: post.id },
          data: { hlsUrl },
        });

        this.logger.log(`[HLS] ✅ Converti: ${post.id} → ${hlsUrl}`);
      } catch (err) {
        this.logger.error(`[HLS] ❌ Erreur post ${post.id}:`, err);
      }
    }

    return { converted: posts.length };
  }
}
