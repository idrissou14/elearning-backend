import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../generated/prisma/enums';
import { CourseContent } from '../mongodb/schemas/course-content.schema';
import { Quiz } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';
import { ExistenceValidatorService } from './existence-validator.service';

const mockPrisma = {
  user: { findFirst: jest.fn() },
  classGroup: { findUnique: jest.fn() },
  enrollment: { findFirst: jest.fn() },
};
const courseContentModel = { exists: jest.fn() };
const quizModel = { exists: jest.fn() };

describe('ExistenceValidatorService', () => {
  let service: ExistenceValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExistenceValidatorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getModelToken(CourseContent.name), useValue: courseContentModel },
        { provide: getModelToken(Quiz.name), useValue: quizModel },
      ],
    }).compile();

    service = module.get(ExistenceValidatorService);
    jest.clearAllMocks();
  });

  describe('assertUserExists', () => {
    it('returns the user when found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.STUDENT });
      await expect(service.assertUserExists('u1')).resolves.toEqual({
        id: 'u1',
        role: Role.STUDENT,
      });
    });

    it('throws NotFound when missing', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.assertUserExists('u1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequest when requireStudent and role is not STUDENT', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.TEACHER });
      await expect(service.assertUserExists('u1', true)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertClassGroupExists', () => {
    it('throws NotFound when missing', async () => {
      mockPrisma.classGroup.findUnique.mockResolvedValue(null);
      await expect(service.assertClassGroupExists('g1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertCourseContentExists', () => {
    it('passes when the content exists', async () => {
      courseContentModel.exists.mockResolvedValue({ _id: 'cc1' });
      await expect(service.assertCourseContentExists('cc1')).resolves.toBeUndefined();
    });

    it('throws NotFound when the content is missing', async () => {
      courseContentModel.exists.mockResolvedValue(null);
      await expect(service.assertCourseContentExists('cc1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertEnrollmentAccess', () => {
    it('passes with an active enrollment', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      await expect(service.assertEnrollmentAccess('u1', 'g1')).resolves.toBeUndefined();
    });

    it('throws Forbidden without an enrollment', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(service.assertEnrollmentAccess('u1', 'g1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
