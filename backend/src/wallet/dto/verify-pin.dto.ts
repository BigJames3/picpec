import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, Length } from 'class-validator';

export class VerifyPinDto {
  @ApiProperty({ description: 'Code PIN à 4 chiffres' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'Le PIN doit contenir exactement 4 chiffres' })
  pin: string;
}
