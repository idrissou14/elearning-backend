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
import { Role, Semester } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCurriculumCourseDto } from './dto/create-curriculum-course.dto';
import { UpdateCurriculumCourseDto } from './dto/update-curriculum-course.dto';
import { CurriculumCourseService } from './curriculum-course.service';

@ApiTags('curriculum-courses')
@Roles(Role.ADMIN)
@Controller('curriculum-course')
export class CurriculumCourseController {
  constructor(private readonly curriculumCourseService: CurriculumCourseService) {}

  @Get()
  @ApiOkResponse({ description: 'List of curriculum courses' })
  findAll(
    @Query('programLevelId') programLevelId?: string,
    @Query('semester') semester?: Semester,
  ) {
    return this.curriculumCourseService.findAll({ programLevelId, semester });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Curriculum course found' })
  @ApiNotFoundResponse({ description: 'Curriculum course not found' })
  findOne(@Param('id') id: string) {
    return this.curriculumCourseService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Curriculum course created' })
  @ApiNotFoundResponse({ description: 'Program level not found' })
  create(@Body() dto: CreateCurriculumCourseDto) {
    return this.curriculumCourseService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Curriculum course updated' })
  @ApiNotFoundResponse({ description: 'Curriculum course or program level not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCurriculumCourseDto) {
    return this.curriculumCourseService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Curriculum course deleted' })
  @ApiNotFoundResponse({ description: 'Curriculum course not found' })
  remove(@Param('id') id: string) {
    return this.curriculumCourseService.remove(id);
  }
}
