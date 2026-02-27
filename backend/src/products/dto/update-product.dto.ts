import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { ProductStatus } from '@prisma/client';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'] })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
