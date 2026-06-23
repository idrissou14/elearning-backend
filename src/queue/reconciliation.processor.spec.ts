import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { CourseContent } from '../mongodb/schemas/course-content.schema';
import { ForumThread } from '../mongodb/schemas/forum-thread.schema';
import { LearnerProgress } from '../mongodb/schemas/learner-progress.schema';
import { Quiz } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  PROGRESS_RETRY_JOB,
  RECONCILIATION_JOB,
} from './queue.constants';
import {
  ReconciliationProcessor,
  ReconciliationReport,
} from './reconciliation.processor';

const mockPrisma = {
  courseInstance: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  classGroup: { findMany: jest.fn() },
  evaluation: { findMany: jest.fn() },
};
const leanOf = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });
const courseContentModel = { find: jest.fn() };
const quizModel = { find: jest.fn() };
const learnerProgressModel = { distinct: jest.fn(), updateOne: jest.fn() };
const forumThreadModel = { distinct: jest.fn() };

describe('ReconciliationProcessor', () => {
  let processor: ReconciliationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getModelToken(CourseContent.name), useValue: courseContentModel },
        { provide: getModelToken(Quiz.name), useValue: quizModel },
        { provide: getModelToken(LearnerProgress.name), useValue: learnerProgressModel },
        { provide: getModelToken(ForumThread.name), useValue: forumThreadModel },
      ],
    }).compile();

    processor = module.get(ReconciliationProcessor);
    jest.clearAllMocks();
  });

  it('detects all five categories of inconsistency', async () => {
    mockPrisma.courseInstance.findMany.mockResolvedValue([
      { id: 'ci1', contentRef: 'cc1' },
      { id: 'ci2', contentRef: 'missing-content' },
    ]);
    courseContentModel.find.mockReturnValue(leanOf([{ _id: 'cc1' }, { _id: 'orphan' }]));

    learnerProgressModel.distinct.mockResolvedValue(['u1', 'ANONYMIZED-deadbeef']);
    mockPrisma.user.findMany.mockResolvedValue([]); // u1 missing

    forumThreadModel.distinct.mockResolvedValue(['g1']);
    mockPrisma.classGroup.findMany.mockResolvedValue([]); // g1 missing

    mockPrisma.evaluation.findMany.mockResolvedValue([{ id: 'e1', quizRef: 'q1' }]);
    quizModel.find.mockReturnValue(leanOf([])); // q1 missing

    const report = (await processor.process({
      name: RECONCILIATION_JOB,
      data: {},
    } as Job)) as ReconciliationReport;

    expect(report.orphanCourseContent).toEqual(['orphan']);
    expect(report.danglingContentRefs).toEqual(['ci2']);
    expect(report.orphanProgressUsers).toEqual(['u1']); // anonymized one ignored
    expect(report.danglingForumGroups).toEqual(['g1']);
    expect(report.danglingQuizRefs).toEqual(['e1']);
  });

  it('handles a progress-retry job by upserting progress', async () => {
    learnerProgressModel.updateOne.mockResolvedValue({});

    await processor.process({
      name: PROGRESS_RETRY_JOB,
      data: { userId: 'u1', courseId: 'c1', classGroupId: 'g1' },
    } as Job);

    expect(learnerProgressModel.updateOne).toHaveBeenCalledWith(
      { userId: 'u1', courseId: 'c1' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({ userId: 'u1', courseId: 'c1' }),
      }),
      { upsert: true },
    );
  });
});
