import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferDto {
  @ApiProperty({ description: 'ID du destinataire' })
  @IsUUID()
  receiverId: string;

  @ApiProperty({ minimum: 1, maximum: 1000000, example: 5000 })
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
