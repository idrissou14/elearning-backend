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
import { EnrollmentStatus, Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EnrollmentService } from './enrollment.service';

@ApiTags('enrollments')
@Roles(Role.ADMIN)
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  @ApiOkResponse({ description: 'List of enrollments' })
  findAll(
    @Query('userId') userId?: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentService.findAll({
      userId,
      classGroupId,
      academicYear,
      status,
    });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Enrollment found' })
  @ApiNotFoundResponse({ description: 'Enrollment not found' })
  findOne(@Param('id') id: string) {
    return this.enrollmentService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Student enrolled' })
  @ApiNotFoundResponse({ description: 'User, class group or previous enrollment not found' })
  @ApiBadRequestResponse({ description: 'User is not a student' })
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Enrollment updated' })
  @ApiNotFoundResponse({ description: 'Enrollment or related resource not found' })
  @ApiBadRequestResponse({ description: 'Invalid update' })
  update(@Param('id') id: string, @Body() dto: UpdateEnrollmentDto) {
    return this.enrollmentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Enrollment deleted' })
  @ApiNotFoundResponse({ description: 'Enrollment not found' })
  remove(@Param('id') id: string) {
    return this.enrollmentService.remove(id);
  }
}
