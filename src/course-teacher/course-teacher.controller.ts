import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourseTeacherService } from './course-teacher.service';
import { CreateCourseTeacherDto } from './dto/create-course-teacher.dto';
import { UpdateCourseTeacherDto } from './dto/update-course-teacher.dto';

@ApiTags('course-teachers')
@Roles(Role.ADMIN)
@Controller('course-teacher')
export class CourseTeacherController {
  constructor(private readonly courseTeacherService: CourseTeacherService) {}

  @Get()
  @ApiOkResponse({ description: 'List of course teacher assignments' })
  findAll(
    @Query('courseInstanceId') courseInstanceId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.courseTeacherService.findAll({ courseInstanceId, teacherId });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Course teacher assignment found' })
  @ApiNotFoundResponse({ description: 'Course teacher assignment not found' })
  findOne(@Param('id') id: string) {
    return this.courseTeacherService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Teacher assigned to course instance' })
  @ApiNotFoundResponse({ description: 'Course instance or user not found' })
  @ApiBadRequestResponse({ description: 'User is not a teacher' })
  create(@Body() dto: CreateCourseTeacherDto) {
    return this.courseTeacherService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Assignment role updated' })
  @ApiNotFoundResponse({ description: 'Course teacher assignment not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseTeacherDto) {
    return this.courseTeacherService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Assignment removed' })
  @ApiNotFoundResponse({ description: 'Course teacher assignment not found' })
  remove(@Param('id') id: string) {
    return this.courseTeacherService.remove(id);
  }
}
