import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
}
