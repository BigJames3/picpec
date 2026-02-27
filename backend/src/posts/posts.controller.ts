import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Express } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/auth.types';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReportPostDto } from './dto/report-post.dto';
import { RecordViewDto } from './dto/record-view.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { appConfig } from '../common/config/app.config';

const VIDEO_EXTENSIONS = [
  '.mp4', '.mov', '.avi', '.webm',
  '.mkv', '.3gp', '.3g2', '.m4v',
  '.wmv', '.flv', '.ogv', '.ts',
  '.mts', '.m2ts',
];

const VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',
  'video/x-m4v',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/ogg',
  'video/mp2t',
  'application/octet-stream',
];

const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif',
  '.webp', '.heic', '.heif',
  '.bmp', '.tiff', '.tif',
  '.avif',
];

const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/x-icon',
  'application/octet-stream',
];

const fileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const ext = extname(file.originalname).toLowerCase();
  const mime = (file.mimetype ?? '').toLowerCase();

  const isVideo =
    VIDEO_EXTENSIONS.includes(ext) ||
    VIDEO_MIMES.includes(mime) ||
    mime.startsWith('video/');

  const isImage =
    IMAGE_EXTENSIONS.includes(ext) ||
    IMAGE_MIMES.includes(mime) ||
    mime.startsWith('image/');

  if (isVideo || isImage) {
    if (isVideo && !VIDEO_EXTENSIONS.includes(ext)) {
      const mimeToExt: Record<string, string> = {
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'video/webm': '.webm',
        'video/3gpp': '.3gp',
        'video/x-m4v': '.m4v',
      };
      file.originalname =
        file.originalname.replace(/\.[^.]+$/, '') + (mimeToExt[mime] ?? '.mp4');
    }

    if (isImage && !IMAGE_EXTENSIONS.includes(ext)) {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/heic': '.heic',
        'image/heif': '.heif',
        'image/avif': '.avif',
      };
      file.originalname =
        file.originalname.replace(/\.[^.]+$/, '') + (mimeToExt[mime] ?? '.jpg');
    }

    console.log(
      `[Upload] Fichier accepté — ext: "${ext}", mime: "${mime}", type: ${isVideo ? 'video' : 'image'}`,
    );
    return cb(null, true);
  }

  console.warn(`[Upload] Fichier rejeté — ext: "${ext}", mime: "${mime}"`);
  cb(
    new Error(
      `Format non supporté. Vidéos: MP4, MOV, AVI, WEBM, MKV, 3GP. Images: JPG, PNG, GIF, WEBP, HEIC, AVIF.`,
    ),
  );
};

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'image', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: join(process.cwd(), 'uploads'),
          filename: (_req, file, cb) => {
            // Utiliser l'extension de originalname (déjà corrigée dans fileFilter)
            const ext = extname(file.originalname).toLowerCase() || '.mp4';
            cb(null, `${uuidv4()}${ext}`);
          },
        }),
        limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
        fileFilter,
      },
    ),
  )
  @ApiOperation({ summary: 'Créer un post avec vidéo (multipart)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201 })
  async create(
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      image?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    } = {},
    @Body() dto: CreatePostDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const imageFile = files?.image?.[0];
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    const apiUrl = appConfig.baseUrl;

    const imageUrl = imageFile
      ? `${apiUrl}/uploads/${imageFile.filename}`
      : dto.imageUrl;
    const videoUrl = videoFile
      ? `${apiUrl}/uploads/${videoFile.filename}`
      : dto.videoUrl;
    const thumbnailUrl = thumbnailFile
      ? `${apiUrl}/uploads/${thumbnailFile.filename}`
      : dto.thumbnailUrl;
    const mediaType = imageFile
      ? 'image'
      : videoFile
        ? 'video'
        : dto.mediaType;

    console.log('[Create Post] imageUrl:', imageUrl);
    console.log('[Create Post] videoUrl:', videoUrl);
    console.log('[Create Post] mediaType:', mediaType);

    return this.postsService.create(user.id, {
      ...dto,
      videoUrl,
      hlsUrl: dto.hlsUrl,
      imageUrl,
      mediaType,
      thumbnailUrl,
      duration: dto.duration,
      videoPath: videoFile
        ? join(process.cwd(), 'uploads', videoFile.filename)
        : undefined,
      imagePath: imageFile
        ? join(process.cwd(), 'uploads', imageFile.filename)
        : undefined,
      thumbnailPath: thumbnailFile
        ? join(process.cwd(), 'uploads', thumbnailFile.filename)
        : undefined,
    });
  }

  @Get('upload-signature')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Génère une signature Cloudinary pour upload direct' })
  getUploadSignature(@Query('type') type: 'video' | 'image' = 'video') {
    if (!this.cloudinaryService.isConfigured()) {
      throw new BadRequestException(
        'Cloudinary non configuré.',
      );
    }
    const folder = type === 'image' ? 'picpec/images' : 'picpec/videos';
    const isVideo = type === 'video';

    return this.cloudinaryService.generateSignature(folder, isVideo);
  }

  @Get('debug/fix-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Debug] Lister les posts avec videoUrl incorrecte' })
  async fixUrlsDebug() {
    await this.postsService.fixBadVideoUrls();
    return { message: 'Voir les logs backend' };
  }

  @Get('admin/fix-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Corriger les videoUrl localhost → IP' })
  fixUrls() {
    return this.postsService.fixVideoUrls();
  }

  @Get('admin/convert-to-hls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Convertir les vidéos existantes en HLS' })
  convertToHls() {
    return this.postsService.convertExistingVideosToHls();
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste paginée des posts (feed)' })
  @ApiResponse({ status: 200, description: 'Liste des posts' })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user?: CurrentUserData | null,
  ) {
    return this.postsService.findAll(
      pagination.page ?? 1,
      pagination.limit ?? 20,
      user?.id,
      pagination.cursor,
    );
  }

  @Get(':id/comments')
  @ApiOperation({ summary: "Liste des commentaires d'un post" })
  @ApiResponse({ status: 200 })
  getComments(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.postsService.getComments(id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un post' })
  @ApiResponse({ status: 200, description: 'Post trouvé' })
  @ApiResponse({ status: 404, description: 'Post non trouvé' })
  findOne(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/like')
  @ApiOperation({ summary: 'Liker un post' })
  @ApiResponse({ status: 200 })
  like(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.postsService.like(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un post (auteur ou ADMIN)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Post introuvable' })
  deletePost(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postsService.remove(id, user.id, user.role);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unliker un post' })
  @ApiResponse({ status: 200 })
  unlikePost(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.postsService.unlike(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/comment')
  comment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.comment(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('users/:userId/follow')
  @ApiOperation({ summary: 'Suivre un utilisateur' })
  followUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postsService.followUser(user.id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('users/:userId/follow')
  @ApiOperation({ summary: 'Ne plus suivre un utilisateur' })
  unfollowUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postsService.unfollowUser(user.id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/report')
  @ApiOperation({ summary: 'Signaler un post' })
  reportPost(
    @Param('id') postId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ReportPostDto,
  ) {
    return this.postsService.reportPost(
      user.id,
      postId,
      dto.reason,
      dto.details,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/share')
  @ApiOperation({ summary: 'Incrémenter le compteur de partages' })
  @ApiResponse({ status: 200 })
  sharePost(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserData | null,
  ) {
    return this.postsService.incrementShare(id, user?.id ?? null);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/view')
  @ApiOperation({ summary: 'Enregistrer une vue sur un post' })
  recordView(
    @Param('id') postId: string,
    @Body() dto: RecordViewDto,
    @CurrentUser() user?: CurrentUserData | null,
  ) {
    return this.postsService.recordView(
      postId,
      user?.id ?? null,
      dto.duration,
    );
  }
}
