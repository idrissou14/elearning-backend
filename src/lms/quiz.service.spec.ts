import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { CrossDbConsistencyService } from '../consistency/cross-db-consistency.service';
import { Quiz } from '../mongodb/schemas/quiz.schema';
import { QuizService } from './quiz.service';

const mockCrossDb = { createEvaluationQuiz: jest.fn() };
const leanOf = (v: unknown) => ({ lean: jest.fn().mockResolvedValue(v) });
const quizModel = { findById: jest.fn() };

describe('QuizService', () => {
  let service: QuizService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: CrossDbConsistencyService, useValue: mockCrossDb },
        { provide: getModelToken(Quiz.name), useValue: quizModel },
      ],
    }).compile();

    service = module.get(QuizService);
    jest.clearAllMocks();
  });

  it('delegates quiz creation to SAGA-02', () => {
    mockCrossDb.createEvaluationQuiz.mockReturnValue({ _id: 'q1' });
    service.createForEvaluation('e1', { title: 'Quiz' });
    expect(mockCrossDb.createEvaluationQuiz).toHaveBeenCalledWith('e1', {
      title: 'Quiz',
      timerSeconds: undefined,
      passingScore: undefined,
      maxAttempts: undefined,
      questions: undefined,
    });
  });

  it('returns a quiz by id', async () => {
    quizModel.findById.mockReturnValue(leanOf({ _id: 'q1', title: 'Quiz' }));
    await expect(service.findOne('q1')).resolves.toEqual({ _id: 'q1', title: 'Quiz' });
  });

  it('throws NotFound for a missing quiz', async () => {
    quizModel.findById.mockReturnValue(leanOf(null));
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
