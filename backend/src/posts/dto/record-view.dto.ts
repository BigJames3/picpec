import { IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecordViewDto {
  @ApiPropertyOptional({ description: 'Durée regardée en secondes' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number;
}
