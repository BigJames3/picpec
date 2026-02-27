import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Super vidéo !' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}
