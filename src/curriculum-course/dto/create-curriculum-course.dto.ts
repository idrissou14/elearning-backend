import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Semester } from '../../../generated/prisma/enums';

export class CreateCurriculumCourseDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  programLevelId: string;

  @ApiProperty({ example: 'Algorithmique et structures de données' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'ALGO-101' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ enum: Semester, example: Semester.S1 })
  @IsEnum(Semester)
  semester: Semester;

  @ApiProperty({ example: 6, minimum: 1 })
  @IsInt()
  @Min(1)
  credits: number;

  @ApiPropertyOptional({ example: 1.5, minimum: 0, maximum: 9.99, default: 1.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9.99)
  coefficient?: number;
}
