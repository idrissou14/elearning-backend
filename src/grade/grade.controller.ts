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
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradeService } from './grade.service';

@ApiTags('grades')
@Controller('grade')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Get()
  @ApiOkResponse({ description: 'List of grades' })
  findAll(
    @Query('enrollmentId') enrollmentId?: string,
    @Query('evaluationId') evaluationId?: string,
  ) {
    return this.gradeService.findAll({ enrollmentId, evaluationId });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Grade found' })
  @ApiNotFoundResponse({ description: 'Grade not found' })
  findOne(@Param('id') id: string) {
    return this.gradeService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Grade created' })
  @ApiNotFoundResponse({ description: 'Enrollment, evaluation or grader not found' })
  @ApiBadRequestResponse({ description: 'Score exceeds maximum or grader not allowed' })
  create(@Body() dto: CreateGradeDto) {
    return this.gradeService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Grade updated' })
  @ApiNotFoundResponse({ description: 'Grade or related resource not found' })
  @ApiBadRequestResponse({ description: 'Score exceeds maximum or grader not allowed' })
  update(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.gradeService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Grade deleted' })
  @ApiNotFoundResponse({ description: 'Grade not found' })
  remove(@Param('id') id: string) {
    return this.gradeService.remove(id);
  }
}
