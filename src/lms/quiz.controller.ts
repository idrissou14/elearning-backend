import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QuizService } from './quiz.service';

@ApiTags('quizzes')
@Controller()
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('evaluation/:id/quiz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/attach the quiz of an evaluation (SAGA-02)' })
  @ApiCreatedResponse({ description: 'Quiz created and linked to the evaluation' })
  @ApiNotFoundResponse({ description: 'Evaluation not found' })
  create(@Param('id') evaluationId: string, @Body() dto: CreateQuizDto) {
    return this.quizService.createForEvaluation(evaluationId, dto);
  }

  @Get('quiz/:quizId')
  @ApiOkResponse({ description: 'Quiz found' })
  @ApiNotFoundResponse({ description: 'Quiz not found' })
  findOne(@Param('quizId') quizId: string) {
    return this.quizService.findOne(quizId);
  }
}
