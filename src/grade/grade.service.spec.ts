import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../generated/prisma/enums';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { GradeService } from './grade.service';

const mockPrisma = {
  grade: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEnrollmentService = { findOne: jest.fn() };
const mockEvaluationService = { findOne: jest.fn() };
const mockUserService = { findOne: jest.fn() };

describe('GradeService', () => {
  let service: GradeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EnrollmentService, useValue: mockEnrollmentService },
        { provide: EvaluationService, useValue: mockEvaluationService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<GradeService>(GradeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the grade when found', async () => {
      const grade = { id: '1', enrollmentId: 'e1', evaluationId: 'v1', score: 15 };
      mockPrisma.grade.findUnique.mockResolvedValue(grade);

      await expect(service.findOne('1')).resolves.toEqual(grade);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.grade.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { enrollmentId: 'e1', evaluationId: 'v1', score: 15 };

    it('creates a grade when parents exist, score is valid and not already graded', async () => {
      mockEnrollmentService.findOne.mockResolvedValue({ id: 'e1' });
      mockEvaluationService.findOne.mockResolvedValue({ id: 'v1', maxScore: 20 });
      mockPrisma.grade.findFirst.mockResolvedValue(null);
      mockPrisma.grade.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockPrisma.grade.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the enrollment is missing', async () => {
      mockEnrollmentService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.grade.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the score exceeds maxScore', async () => {
      mockEnrollmentService.findOne.mockResolvedValue({ id: 'e1' });
      mockEvaluationService.findOne.mockResolvedValue({ id: 'v1', maxScore: 10 });

      await expect(service.create({ ...dto, score: 15 })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.grade.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the grader is a student', async () => {
      mockEnrollmentService.findOne.mockResolvedValue({ id: 'e1' });
      mockEvaluationService.findOne.mockResolvedValue({ id: 'v1', maxScore: 20 });
      mockUserService.findOne.mockResolvedValue({ id: 'g1', role: Role.STUDENT });

      await expect(service.create({ ...dto, gradedBy: 'g1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.grade.create).not.toHaveBeenCalled();
    });

    it('accepts a teacher as grader', async () => {
      mockEnrollmentService.findOne.mockResolvedValue({ id: 'e1' });
      mockEvaluationService.findOne.mockResolvedValue({ id: 'v1', maxScore: 20 });
      mockUserService.findOne.mockResolvedValue({ id: 'g1', role: Role.TEACHER });
      mockPrisma.grade.findFirst.mockResolvedValue(null);
      mockPrisma.grade.create.mockResolvedValue({ id: '1' });

      await service.create({ ...dto, gradedBy: 'g1' });
      expect(mockUserService.findOne).toHaveBeenCalledWith('g1');
      expect(mockPrisma.grade.create).toHaveBeenCalled();
    });

    it('throws ConflictException when already graded', async () => {
      mockEnrollmentService.findOne.mockResolvedValue({ id: 'e1' });
      mockEvaluationService.findOne.mockResolvedValue({ id: 'v1', maxScore: 20 });
      mockPrisma.grade.findFirst.mockResolvedValue({ id: '99' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.grade.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the grade does not exist', async () => {
      mockPrisma.grade.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { score: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('re-validates the score against the evaluation maxScore', async () => {
      mockPrisma.grade.findUnique.mockResolvedValue({
        id: '1',
        enrollmentId: 'e1',
        evaluationId: 'v1',
        score: 8,
      });
      mockEvaluationService.findOne.mockResolvedValue({ id: 'v1', maxScore: 10 });

      await expect(service.update('1', { score: 18 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates the comment without re-checking the score', async () => {
      const current = {
        id: '1',
        enrollmentId: 'e1',
        evaluationId: 'v1',
        score: 8,
      };
      mockPrisma.grade.findUnique.mockResolvedValue(current);
      mockPrisma.grade.findFirst.mockResolvedValue(current); // same record
      mockPrisma.grade.update.mockResolvedValue({ ...current, comment: 'ok' });

      await service.update('1', { comment: 'ok' });
      expect(mockEvaluationService.findOne).not.toHaveBeenCalled();
      expect(mockPrisma.grade.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { comment: 'ok' },
      });
    });
  });

  describe('remove', () => {
    it('deletes an existing grade', async () => {
      mockPrisma.grade.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.grade.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.grade.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing grade', async () => {
      mockPrisma.grade.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.grade.delete).not.toHaveBeenCalled();
    });
  });
});
