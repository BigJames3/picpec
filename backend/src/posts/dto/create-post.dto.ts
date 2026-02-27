import { IsString, IsOptional, MaxLength, IsIn, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @ApiPropertyOptional({ description: 'URL Cloudinary de la vidéo' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'URL HLS (.m3u8) pour streaming adaptatif' })
  @IsOptional()
  @IsString()
  hlsUrl?: string;

  @ApiPropertyOptional({ description: 'Durée de la vidéo en secondes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'URL Cloudinary de l\'image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'URL Cloudinary du thumbnail' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Type de média: video | image' })
  @IsOptional()
  @IsString()
  @IsIn(['video', 'image'])
  mediaType?: string;
}
