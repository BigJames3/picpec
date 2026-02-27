import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FrequenceType } from '@prisma/client';

export class CreateTontineDto {
  @ApiProperty({ example: 'Tontine Mensuelle Famille' })
  @IsString()
  titre: string;

  @ApiProperty({ example: 'Épargne collective pour les vacances' })
  @IsString()
  description: string;

  @ApiProperty({ example: 5000, description: 'Cotisation en FCFA' })
  @IsNumber()
  @Min(1, { message: 'Le montant doit être positif' })
  @Type(() => Number)
  montant: number;

  @ApiProperty({ example: 10, description: 'Nombre de membres (et de tours)' })
  @IsNumber()
  @Min(2, { message: 'Minimum 2 membres' })
  @Type(() => Number)
  nombreMembres: number;

  @ApiProperty({ enum: FrequenceType })
  @IsEnum(FrequenceType)
  frequence: FrequenceType;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  dateDebut: string;

  @ApiProperty({ example: 5, required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(50, { message: 'Taux de pénalité entre 0 et 50%' })
  @Type(() => Number)
  tauxPenalite?: number;
}
