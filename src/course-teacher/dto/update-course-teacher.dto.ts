import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CourseTeacherRole } from '../../../generated/prisma/enums';

export class UpdateCourseTeacherDto {
  @ApiPropertyOptional({ enum: CourseTeacherRole })
  @IsOptional()
  @IsEnum(CourseTeacherRole)
  role?: CourseTeacherRole;
}
