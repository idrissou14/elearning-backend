import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';
import { ClassStatus } from '../../../generated/prisma/enums';

export class CreateClassGroupDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  programLevelId: string;

  @ApiProperty({ example: 'Groupe A' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: '2025-2026' })
  @Matches(/^\d{4}-\d{4}$/, { message: 'academicYear must be in the format YYYY-YYYY' })
  academicYear: string;

  @ApiPropertyOptional({ enum: ClassStatus, default: ClassStatus.DRAFT })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}
