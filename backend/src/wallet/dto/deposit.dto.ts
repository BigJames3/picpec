import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DepositDto {
  @ApiProperty({ example: 10000, minimum: 100, maximum: 10_000_000 })
  @IsNumber()
  @IsPositive()
  @Min(100)
  @Max(10_000_000, { message: 'Deposit max 10 000 000 XOF' })
  @Type(() => Number)
  amount: number;
}
