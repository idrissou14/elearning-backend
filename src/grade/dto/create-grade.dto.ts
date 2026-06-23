import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  enrollmentId: string;

  @ApiProperty({ example: '7b2d5e8a-1c3d-4a6e-9c0f-3f1a8c2e1d4b' })
  @IsUUID()
  evaluationId: string;

  @ApiProperty({ example: 15.5, minimum: 0, maximum: 999.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  score: number;

  @ApiPropertyOptional({
    example: '1c3d4a6e-9c0f-3f1a-8c2e-1d4b7b2d5e8a',
    description: 'User (teacher/admin) who graded',
  })
  @IsOptional()
  @IsUUID()
  gradedBy?: string;

  @ApiPropertyOptional({ example: 'Bon travail, attention aux détails.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
