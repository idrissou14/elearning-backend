import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrossDbConsistencyService } from '../consistency/cross-db-consistency.service';
import { Question, Quiz, QuizDocument } from '../mongodb/schemas/quiz.schema';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Injectable()
export class QuizService {
  constructor(
    private readonly crossDb: CrossDbConsistencyService,
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
  ) {}

  /** SAGA-02 — create (or update) the quiz of an evaluation. */
  createForEvaluation(evaluationId: string, dto: CreateQuizDto) {
    return this.crossDb.createEvaluationQuiz(evaluationId, {
      title: dto.title,
      timerSeconds: dto.timerSeconds,
      passingScore: dto.passingScore,
      maxAttempts: dto.maxAttempts,
      questions: dto.questions as Question[] | undefined,
    });
  }

  async findOne(quizId: string) {
    const quiz = await this.quizModel.findById(quizId).lean();
    if (!quiz) throw new NotFoundException(`Quiz ${quizId} not found`);
    return quiz;
  }
}
