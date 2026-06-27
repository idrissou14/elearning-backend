import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentService } from './student.service';

@ApiTags('student')
@Roles(Role.STUDENT)
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('me/overview')
  @ApiOkResponse({
    description: 'Aggregated dashboard data for the current student',
  })
  getOverview(@CurrentUser('id') userId: string) {
    return this.studentService.getOverview(userId);
  }

  @Get('me/courses')
  @ApiOkResponse({
    description: 'Courses accessible to the current student (active enrollments)',
  })
  getCourses(@CurrentUser('id') userId: string) {
    return this.studentService.getCourses(userId);
  }
}
