import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type PaymentProviderDto = 'MTN_MOMO' | 'ORANGE_MONEY' | 'WAVE';

export class InitiatePaymentDto {
  @ApiProperty()
  @IsUUID()
  tontineId: string;

  @ApiProperty({ enum: ['MTN_MOMO', 'ORANGE_MONEY', 'WAVE'] })
  @IsEnum(['MTN_MOMO', 'ORANGE_MONEY', 'WAVE'])
  provider: PaymentProviderDto;

  @ApiProperty({ description: 'Numéro mobile money (ex: 2250700000000)' })
  @IsString()
  phone: string;
}
