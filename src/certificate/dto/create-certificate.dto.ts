import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  enrollmentId: string;

  @ApiProperty({ example: 'certificates/2025-2026/u1-enrollment.pdf' })
  @IsString()
  @MinLength(1)
  s3Path: string;
}
