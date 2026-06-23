import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CourseTeacherRole } from '../../../generated/prisma/enums';

export class CreateCourseTeacherDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  courseInstanceId: string;

  @ApiProperty({ example: '7b2d5e8a-1c3d-4a6e-9c0f-3f1a8c2e1d4b' })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    enum: CourseTeacherRole,
    default: CourseTeacherRole.MAIN_TEACHER,
  })
  @IsOptional()
  @IsEnum(CourseTeacherRole)
  role?: CourseTeacherRole;
}
