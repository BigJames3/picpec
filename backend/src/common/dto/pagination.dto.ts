import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Cursor pour pagination cursor-based (id du dernier élément)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    cursor?: string;
    /** For feed API: id of last item, use as ?cursor= for next page */
    nextCursor?: string | null;
    hasMore?: boolean;
  };
}

export function paginate<T extends { id?: string }>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  opts?: { cursorBased?: boolean },
): PaginatedResult<T> {
  const lastItem = data[data.length - 1];
  const hasMore = opts?.cursorBased
    ? data.length === limit
    : page * limit < total;
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: hasMore,
      hasPreviousPage: page > 1,
      cursor: lastItem?.id,
      nextCursor: hasMore ? lastItem?.id ?? null : null,
      hasMore,
    },
  };
}
