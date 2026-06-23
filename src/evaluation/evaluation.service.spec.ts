import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationType } from '../../generated/prisma/enums';
import { CoursInstanceService } from '../cours-instance/cours-instance.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from './evaluation.service';

const mockPrisma = {
  evaluation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCoursInstanceService = { findOne: jest.fn() };

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CoursInstanceService, useValue: mockCoursInstanceService },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the evaluation when found', async () => {
      const evaluation = { id: '1', name: 'CC1', courseInstanceId: 'ci1' };
      mockPrisma.evaluation.findUnique.mockResolvedValue(evaluation);

      await expect(service.findOne('1')).resolves.toEqual(evaluation);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      courseInstanceId: 'ci1',
      type: EvaluationType.CC,
      name: 'Contrôle continu 1',
      weight: 0.3,
    };

    it('creates an evaluation when the course instance exists', async () => {
      mockCoursInstanceService.findOne.mockResolvedValue({ id: 'ci1' });
      mockPrisma.evaluation.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockCoursInstanceService.findOne).toHaveBeenCalledWith('ci1');
      expect(mockPrisma.evaluation.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the course instance is missing', async () => {
      mockCoursInstanceService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.evaluation.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the evaluation does not exist', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates the new course instance when courseInstanceId changes', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({ id: '1', name: 'Old' });
      mockCoursInstanceService.findOne.mockResolvedValue({ id: 'ci2' });
      mockPrisma.evaluation.update.mockResolvedValue({ id: '1', courseInstanceId: 'ci2' });

      await service.update('1', { courseInstanceId: 'ci2' });
      expect(mockCoursInstanceService.findOne).toHaveBeenCalledWith('ci2');
    });

    it('updates without touching the course instance when it is unchanged', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({ id: '1', name: 'Old' });
      mockPrisma.evaluation.update.mockResolvedValue({ id: '1', name: 'New' });

      await service.update('1', { name: 'New' });
      expect(mockCoursInstanceService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing evaluation', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.evaluation.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.evaluation.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing evaluation', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.evaluation.delete).not.toHaveBeenCalled();
    });
  });
});
