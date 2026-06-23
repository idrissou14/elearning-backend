import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCertificateDto {
  @ApiPropertyOptional({ example: 'certificates/2025-2026/u1-enrollment-v2.pdf' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  s3Path?: string;
}
