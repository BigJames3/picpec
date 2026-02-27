import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportPostDto {
  @ApiProperty({ enum: ['SPAM', 'VIOLENCE', 'INAPPROPRIATE', 'OTHER'] })
  @IsString()
  @IsIn(['SPAM', 'VIOLENCE', 'INAPPROPRIATE', 'OTHER'])
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;
}
