import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WithdrawDto {
  @ApiProperty({ example: 5000, minimum: 100, maximum: 5_000_000 })
  @IsNumber()
  @IsPositive()
  @Min(100)
  @Max(5_000_000, { message: 'Withdraw max 5 000 000 XOF' })
  @Type(() => Number)
  amount: number;
}
