import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { EvaluationType } from '../../../generated/prisma/enums';

export class CreateEvaluationDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  courseInstanceId: string;

  @ApiProperty({ enum: EvaluationType, example: EvaluationType.CC })
  @IsEnum(EvaluationType)
  type: EvaluationType;

  @ApiProperty({ example: 'Contrôle continu n°1' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 0.3, minimum: 0, maximum: 9.99, description: 'Weight in the final grade' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9.99)
  weight: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 999.99, default: 20.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  maxScore?: number;

  @ApiPropertyOptional({
    example: '665f1b2c3d4e5f6a7b8c9d0e',
    description: 'Reference to MongoDB quizzes document',
  })
  @IsOptional()
  @IsString()
  quizRef?: string;

  @ApiPropertyOptional({ example: '2026-01-15T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
