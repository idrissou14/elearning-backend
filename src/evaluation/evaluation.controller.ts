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
import { EvaluationType } from '../../generated/prisma/enums';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { EvaluationService } from './evaluation.service';

@ApiTags('evaluations')
@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get()
  @ApiOkResponse({ description: 'List of evaluations' })
  findAll(
    @Query('courseInstanceId') courseInstanceId?: string,
    @Query('type') type?: EvaluationType,
  ) {
    return this.evaluationService.findAll({ courseInstanceId, type });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Evaluation found' })
  @ApiNotFoundResponse({ description: 'Evaluation not found' })
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Evaluation created' })
  @ApiNotFoundResponse({ description: 'Course instance not found' })
  create(@Body() dto: CreateEvaluationDto) {
    return this.evaluationService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Evaluation updated' })
  @ApiNotFoundResponse({ description: 'Evaluation or course instance not found' })
  update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto) {
    return this.evaluationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Evaluation deleted' })
  @ApiNotFoundResponse({ description: 'Evaluation not found' })
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(id);
  }
}
