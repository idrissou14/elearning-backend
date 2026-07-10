import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { CrossDbConsistencyService } from '../consistency/cross-db-consistency.service';
import { ExistenceValidatorService } from '../consistency/existence-validator.service';
import { CourseContent } from '../mongodb/schemas/course-content.schema';
import { LearnerProgress } from '../mongodb/schemas/learner-progress.schema';
import { Quiz } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';
import { LmsContentService } from './lms-content.service';

const mockPrisma = {
  courseInstance: { findUnique: jest.fn() },
  evaluation: { findFirst: jest.fn() },
};
const mockCrossDb = { createCourseContent: jest.fn() };
const mockExistence = { assertEnrollmentAccess: jest.fn() };
const leanOf = (v: unknown) => ({ lean: jest.fn().mockResolvedValue(v) });
const courseContentModel = { findById: jest.fn() };
const learnerProgressModel = { findOne: jest.fn() };
const quizModel = { findById: jest.fn() };

describe('LmsContentService', () => {
  let service: LmsContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LmsContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CrossDbConsistencyService, useValue: mockCrossDb },
        { provide: ExistenceValidatorService, useValue: mockExistence },
        {
          provide: getModelToken(CourseContent.name),
          useValue: courseContentModel,
        },
        {
          provide: getModelToken(LearnerProgress.name),
          useValue: learnerProgressModel,
        },
        { provide: getModelToken(Quiz.name), useValue: quizModel },
      ],
    }).compile();

    service = module.get(LmsContentService);
    jest.clearAllMocks();
  });

  it('delegates content creation to SAGA-01', () => {
    mockCrossDb.createCourseContent.mockReturnValue({ _id: 'cc1' });
    service.createContent('ci1', { title: 'Intro' });
    expect(mockCrossDb.createCourseContent).toHaveBeenCalledWith('ci1', {
      title: 'Intro',
      description: undefined,
      modules: undefined,
    });
  });

  describe('getContentForUser', () => {
    it('merges metadata, content and progress after the access check', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({
        id: 'ci1',
        classGroupId: 'g1',
        academicYear: '2025-2026',
        contentRef: 'cc1',
        curriculumCourse: { name: 'Algo' },
      });
      mockExistence.assertEnrollmentAccess.mockResolvedValue(undefined);
      courseContentModel.findById.mockReturnValue(
        leanOf({ _id: 'cc1', title: 'Intro' }),
      );
      learnerProgressModel.findOne.mockReturnValue(leanOf({ userId: 'u1' }));

      const result = await service.getContentForUser('ci1', 'u1');

      expect(mockExistence.assertEnrollmentAccess).toHaveBeenCalledWith('u1', {
        id: 'ci1',
        classGroupId: 'g1',
      });
      expect(result.content).toEqual({ _id: 'cc1', title: 'Intro' });
      expect(result.progress).toEqual({ userId: 'u1' });
      expect(result.metadata.courseInstanceId).toBe('ci1');
    });

    it('throws 403 when the user is not enrolled', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({
        id: 'ci1',
        classGroupId: 'g1',
        contentRef: 'cc1',
      });
      mockExistence.assertEnrollmentAccess.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(service.getContentForUser('ci1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFound when no content is published', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({
        id: 'ci1',
        classGroupId: 'g1',
        contentRef: null,
      });
      mockExistence.assertEnrollmentAccess.mockResolvedValue(undefined);

      await expect(service.getContentForUser('ci1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound when the course instance is missing', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue(null);

      await expect(service.getContentForUser('missing', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
