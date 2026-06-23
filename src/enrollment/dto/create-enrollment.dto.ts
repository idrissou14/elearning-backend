import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { EnrollmentStatus } from '../../../generated/prisma/enums';

export class CreateEnrollmentDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '7b2d5e8a-1c3d-4a6e-9c0f-3f1a8c2e1d4b' })
  @IsUUID()
  classGroupId: string;

  @ApiProperty({ example: '2025-2026' })
  @Matches(/^\d{4}-\d{4}$/, { message: 'academicYear must be in the format YYYY-YYYY' })
  academicYear: string;

  @ApiPropertyOptional({ enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    example: '1c3d4a6e-9c0f-3f1a-8c2e-1d4b7b2d5e8a',
    description: 'Previous enrollment (for re-enrollment / history)',
  })
  @IsOptional()
  @IsUUID()
  previousEnrollmentId?: string;
}
