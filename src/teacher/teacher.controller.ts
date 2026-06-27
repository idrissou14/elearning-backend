import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { TeacherService } from './teacher.service';

@ApiTags('teacher')
@Roles(Role.TEACHER)
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('course-instances')
  @ApiOkResponse({
    description: 'Course instances assigned to the current teacher',
  })
  getCourseInstances(@CurrentUser('id') teacherId: string) {
    return this.teacherService.getCourseInstances(teacherId);
  }

  @Get('course-instances/:id/content')
  @ApiOperation({
    summary: 'Read-only LMS content the teacher published for one of their instances',
  })
  @ApiOkResponse({ description: 'Course instance summary + published content' })
  @ApiForbiddenResponse({ description: 'Teacher not assigned to this instance' })
  @ApiNotFoundResponse({ description: 'No content published for this course' })
  getCourseContent(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseInstanceId: string,
  ) {
    return this.teacherService.getCourseContent(teacherId, courseInstanceId);
  }
}
