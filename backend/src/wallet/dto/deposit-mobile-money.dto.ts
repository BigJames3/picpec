import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum MobileMoneyProvider {
  MTN_MOMO = 'MTN_MOMO',
  ORANGE_MONEY = 'ORANGE_MONEY',
  WAVE = 'WAVE',
}

export class DepositMobileMoneyDto {
  @ApiProperty({ example: 5000, minimum: 500, maximum: 10_000_000 })
  @IsNumber()
  @Min(500)
  @Max(10_000_000)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: MobileMoneyProvider })
  @IsEnum(MobileMoneyProvider)
  provider: MobileMoneyProvider;

  @ApiProperty({ description: 'Numéro Mobile Money du déposant' })
  @IsString()
  phone: string;
}

export class WithdrawMobileMoneyDto {
  @ApiProperty({ example: 5000, minimum: 500, maximum: 5_000_000 })
  @IsNumber()
  @Min(500)
  @Max(5_000_000)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: MobileMoneyProvider })
  @IsEnum(MobileMoneyProvider)
  provider: MobileMoneyProvider;

  @ApiProperty({ description: 'Numéro Mobile Money de destination' })
  @IsString()
  phone: string;
}
