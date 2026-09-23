import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { GradeStatus } from '../grade/dto/create-grade.dto';

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
    summary:
      'Read-only LMS content the teacher published for one of their instances',
  })
  @ApiOkResponse({ description: 'Course instance summary + published content' })
  @ApiForbiddenResponse({
    description: 'Teacher not assigned to this instance',
  })
  @ApiNotFoundResponse({ description: 'No content published for this course' })
  getCourseContent(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseInstanceId: string,
  ) {
    return this.teacherService.getCourseContent(teacherId, courseInstanceId);
  }

  @Get('course-instances/:id/grades')
  @ApiOperation({
    summary: 'Grades grid for a course instance (students x evaluations)',
  })
  @ApiOkResponse({ description: 'Grades matrix with stats' })
  @ApiForbiddenResponse({ description: 'Teacher not assigned to this instance' })
  @ApiNotFoundResponse({ description: 'Course instance not found' })
  getGradesForInstance(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseInstanceId: string,
  ) {
    return this.teacherService.getGradesForInstance(teacherId, courseInstanceId);
  }

  @Post('course-instances/:id/grades/bulk')
  @ApiOperation({
    summary: 'Bulk create/update grades for a course instance',
  })
  @ApiOkResponse({ description: 'Grades upserted' })
  @ApiForbiddenResponse({ description: 'Teacher not assigned or enrollment not accessible' })
  @ApiNotFoundResponse({ description: 'Evaluation not found in this course' })
  @ApiBadRequestResponse({ description: 'Score exceeds maximum' })
  bulkUpsertGrades(
    @CurrentUser('id') teacherId: string,
    @Param('id') courseInstanceId: string,
    @Body()
    items: Array<{
      enrollmentId: string;
      evaluationId: string;
      score: number;
      comment?: string;
      status?: GradeStatus;
    }>,
  ) {
    return this.teacherService.bulkUpsertGrades(teacherId, courseInstanceId, items);
  }
}
