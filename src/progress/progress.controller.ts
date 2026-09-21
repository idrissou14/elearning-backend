import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProgressService, CourseProgress, LessonProgress } from './progress.service';

@ApiTags('progress')
@Roles(Role.STUDENT)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('course/:courseInstanceId')
  @ApiOperation({ summary: 'Get progress for a specific course instance' })
  @ApiOkResponse({ description: 'Course progress with lesson completion status' })
  async getCourseProgress(
    @CurrentUser('id') userId: string,
    @Param('courseInstanceId') courseInstanceId: string
  ): Promise<CourseProgress | null> {
    return this.progressService.getProgress(userId, courseInstanceId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all course progress for the current student' })
  @ApiOkResponse({ description: 'Array of course progress objects' })
  async getAllProgress(@CurrentUser('id') userId: string): Promise<CourseProgress[]> {
    return this.progressService.getAllProgress(userId);
  }

  @Post('course/:courseInstanceId/lesson/:lessonId/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  @ApiOkResponse({ description: 'Updated course progress' })
  async markLessonComplete(
    @CurrentUser('id') userId: string,
    @Param('courseInstanceId') courseInstanceId: string,
    @Param('lessonId') lessonId: string,
    @Body('timeSpentMs') timeSpentMs?: number
  ): Promise<CourseProgress> {
    return this.progressService.markLessonComplete(userId, courseInstanceId, lessonId);
  }

  @Patch('course/:courseInstanceId/lesson/:lessonId')
  @ApiOperation({ summary: 'Update lesson progress (complete/incomplete, time spent)' })
  @ApiOkResponse({ description: 'Updated course progress' })
  async updateLessonProgress(
    @CurrentUser('id') userId: string,
    @Param('courseInstanceId') courseInstanceId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: { completed: boolean; timeSpentMs?: number }
  ): Promise<CourseProgress> {
    return this.progressService.updateProgress(
      userId,
      courseInstanceId,
      lessonId,
      body.completed,
      body.timeSpentMs
    );
  }
}