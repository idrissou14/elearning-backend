import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateCoursInstanceDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  curriculumCourseId: string;

  @ApiProperty({ example: '7b2d5e8a-1c3d-4a6e-9c0f-3f1a8c2e1d4b' })
  @IsUUID()
  classGroupId: string;

  @ApiProperty({ example: '2025-2026' })
  @Matches(/^\d{4}-\d{4}$/, { message: 'academicYear must be in the format YYYY-YYYY' })
  academicYear: string;

  @ApiPropertyOptional({
    example: '665f1b2c3d4e5f6a7b8c9d0e',
    description: 'Reference to MongoDB course_content document',
  })
  @IsOptional()
  @IsString()
  contentRef?: string;
}
