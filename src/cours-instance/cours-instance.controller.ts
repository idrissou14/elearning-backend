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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CoursInstanceService } from './cours-instance.service';
import { CreateCoursInstanceDto } from './dto/create-cours-instance.dto';
import { UpdateCoursInstanceDto } from './dto/update-cours-instance.dto';

@ApiTags('course-instances')
@Controller('cours-instance')
export class CoursInstanceController {
  constructor(private readonly coursInstanceService: CoursInstanceService) {}

  @Get()
  @ApiOkResponse({ description: 'List of course instances' })
  findAll(
    @Query('curriculumCourseId') curriculumCourseId?: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.coursInstanceService.findAll({
      curriculumCourseId,
      classGroupId,
      academicYear,
    });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Course instance found' })
  @ApiNotFoundResponse({ description: 'Course instance not found' })
  findOne(@Param('id') id: string) {
    return this.coursInstanceService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Course instance created' })
  @ApiNotFoundResponse({ description: 'Curriculum course or class group not found' })
  create(@Body() dto: CreateCoursInstanceDto) {
    return this.coursInstanceService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Course instance updated' })
  @ApiNotFoundResponse({ description: 'Course instance, curriculum course or class group not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCoursInstanceDto) {
    return this.coursInstanceService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Course instance deleted' })
  @ApiNotFoundResponse({ description: 'Course instance not found' })
  remove(@Param('id') id: string) {
    return this.coursInstanceService.remove(id);
  }
}
