import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUrl, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 12' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  price: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  stock: number;

  @ApiPropertyOptional({ description: 'ID de la catégorie' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
