import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  EnrollmentStatus,
  EnrollmentType,
} from '../../../generated/prisma/enums';

export class CreateEnrollmentDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    enum: EnrollmentType,
    default: EnrollmentType.CURSUS,
    description:
      'CURSUS = inscription pleine à un ClassGroup ; RENFORCEMENT = une seule matière (CourseInstance)',
  })
  @IsOptional()
  @IsEnum(EnrollmentType)
  type?: EnrollmentType;

  @ApiPropertyOptional({
    example: '7b2d5e8a-1c3d-4a6e-9c0f-3f1a8c2e1d4b',
    description: 'Requis pour une inscription CURSUS',
  })
  @ValidateIf(
    (o: CreateEnrollmentDto) =>
      (o.type ?? EnrollmentType.CURSUS) === EnrollmentType.CURSUS,
  )
  @IsUUID()
  classGroupId?: string;

  @ApiPropertyOptional({
    example: '9c0f3f1a-8c2e-1d4b-7b2d-5e8a1c3d4a6e',
    description:
      "Requis pour une inscription RENFORCEMENT ; l'année académique en est dérivée",
  })
  @ValidateIf(
    (o: CreateEnrollmentDto) => o.type === EnrollmentType.RENFORCEMENT,
  )
  @IsUUID()
  courseInstanceId?: string;

  @ApiPropertyOptional({
    example: '2025-2026',
    description:
      'Requis pour CURSUS ; ignoré pour RENFORCEMENT (dérivé de la matière)',
  })
  @ValidateIf(
    (o: CreateEnrollmentDto) =>
      (o.type ?? EnrollmentType.CURSUS) === EnrollmentType.CURSUS,
  )
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear must be in the format YYYY-YYYY',
  })
  academicYear?: string;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
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
