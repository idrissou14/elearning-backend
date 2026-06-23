import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CourseContent,
} from '../mongodb/schemas/course-content.schema';
import { LearnerProgress } from '../mongodb/schemas/learner-progress.schema';
import { Quiz } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  GDPR_ERASE_QUEUE,
  RECONCILIATION_QUEUE,
} from '../queue/queue.constants';
import { CrossDbConsistencyService } from './cross-db-consistency.service';
import { ExistenceValidatorService } from './existence-validator.service';

const mockPrisma = {
  courseInstance: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  evaluation: { findUnique: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
};

const courseContentModel = {
  create: jest.fn(),
  findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
};
const quizModel = {
  create: jest.fn(),
  findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
};
const learnerProgressModel = { updateOne: jest.fn() };

const reconciliationQueue = { add: jest.fn() };
const gdprQueue = { add: jest.fn() };
const existence = {};

describe('CrossDbConsistencyService', () => {
  let service: CrossDbConsistencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossDbConsistencyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExistenceValidatorService, useValue: existence },
        { provide: getModelToken(CourseContent.name), useValue: courseContentModel },
        { provide: getModelToken(Quiz.name), useValue: quizModel },
        { provide: getModelToken(LearnerProgress.name), useValue: learnerProgressModel },
        { provide: getQueueToken(RECONCILIATION_QUEUE), useValue: reconciliationQueue },
        { provide: getQueueToken(GDPR_ERASE_QUEUE), useValue: gdprQueue },
      ],
    }).compile();

    service = module.get(CrossDbConsistencyService);
    jest.clearAllMocks();
    courseContentModel.deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    quizModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
  });

  describe('SAGA-01 createCourseContent', () => {
    it('writes Mongo first then links the UUID in Postgres', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({ id: 'ci1', contentRef: null });
      courseContentModel.create.mockResolvedValue({ _id: 'generated' });
      mockPrisma.courseInstance.update.mockResolvedValue({});

      await service.createCourseContent('ci1', { title: 'Intro' });

      const createdId = courseContentModel.create.mock.calls[0][0]._id;
      expect(createdId).toBeDefined();
      expect(mockPrisma.courseInstance.update).toHaveBeenCalledWith({
        where: { id: 'ci1' },
        data: { contentRef: createdId },
      });
    });

    it('COMPENSATES by deleting the Mongo doc when the Postgres write fails', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({ id: 'ci1', contentRef: null });
      courseContentModel.create.mockResolvedValue({ _id: 'generated' });
      mockPrisma.courseInstance.update.mockRejectedValue(new Error('pg down'));

      await expect(service.createCourseContent('ci1', { title: 'Intro' })).rejects.toThrow(
        'pg down',
      );

      const createdId = courseContentModel.create.mock.calls[0][0]._id;
      expect(courseContentModel.deleteOne).toHaveBeenCalledWith({ _id: createdId });
    });

    it('is idempotent: updates existing content instead of recreating', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({
        id: 'ci1',
        contentRef: 'existing-uuid',
      });
      courseContentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'existing-uuid' }),
      });

      await service.createCourseContent('ci1', { title: 'Updated' });

      expect(courseContentModel.create).not.toHaveBeenCalled();
      expect(courseContentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'existing-uuid',
        { $set: { title: 'Updated' } },
        { new: true },
      );
    });

    it('throws NotFound when the course instance does not exist', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue(null);

      await expect(service.createCourseContent('missing', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(courseContentModel.create).not.toHaveBeenCalled();
    });
  });

  describe('SAGA-02 createEvaluationQuiz', () => {
    it('COMPENSATES by deleting the Mongo quiz when the Postgres write fails', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        id: 'e1',
        courseInstanceId: 'ci1',
        quizRef: null,
      });
      mockPrisma.courseInstance.findUnique.mockResolvedValue({ id: 'ci1', contentRef: 'cc1' });
      quizModel.create.mockResolvedValue({ _id: 'generated' });
      mockPrisma.evaluation.update.mockRejectedValue(new Error('pg down'));

      await expect(
        service.createEvaluationQuiz('e1', { title: 'Quiz' }),
      ).rejects.toThrow('pg down');

      const createdId = quizModel.create.mock.calls[0][0]._id;
      expect(quizModel.deleteOne).toHaveBeenCalledWith({ _id: createdId });
    });

    it('links the quiz UUID into Evaluation.quizRef on success', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        id: 'e1',
        courseInstanceId: 'ci1',
        quizRef: null,
      });
      mockPrisma.courseInstance.findUnique.mockResolvedValue({ id: 'ci1', contentRef: 'cc1' });
      quizModel.create.mockResolvedValue({ _id: 'generated' });
      mockPrisma.evaluation.update.mockResolvedValue({});

      await service.createEvaluationQuiz('e1', { title: 'Quiz' });

      const createdId = quizModel.create.mock.calls[0][0]._id;
      expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { quizRef: createdId },
      });
    });
  });

  describe('SAGA-03 initEnrollmentProgress', () => {
    it('upserts progress and queues a retry only for failed inserts', async () => {
      mockPrisma.courseInstance.findMany.mockResolvedValue([
        { contentRef: 'c1' },
        { contentRef: 'c2' },
      ]);
      learnerProgressModel.updateOne
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('mongo down'));

      await service.initEnrollmentProgress({ userId: 'u1', classGroupId: 'g1' });

      expect(learnerProgressModel.updateOne).toHaveBeenCalledTimes(2);
      expect(reconciliationQueue.add).toHaveBeenCalledTimes(1);
      expect(reconciliationQueue.add).toHaveBeenCalledWith(
        'init-progress-retry',
        { userId: 'u1', courseId: 'c2', classGroupId: 'g1' },
      );
    });
  });

  describe('SAGA-04 requestGdprErase', () => {
    it('soft-deletes the user and enqueues an idempotent erase job', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'real@x.com' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.requestGdprErase('u1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ status: 'DELETED' }),
      });
      expect(gdprQueue.add).toHaveBeenCalledWith(
        'gdpr-erase',
        { userId: 'u1', actorEmailSnapshot: 'real@x.com' },
        expect.objectContaining({ jobId: 'gdpr-u1' }),
      );
    });

    it('throws NotFound for an unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.requestGdprErase('missing')).rejects.toThrow(NotFoundException);
      expect(gdprQueue.add).not.toHaveBeenCalled();
    });
  });
});
