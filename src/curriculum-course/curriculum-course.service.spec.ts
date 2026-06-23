import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Semester } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramLevelService } from '../program-level/program-level.service';
import { CurriculumCourseService } from './curriculum-course.service';

const mockPrisma = {
  curriculumCourse: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockProgramLevelService = {
  findOne: jest.fn(),
};

describe('CurriculumCourseService', () => {
  let service: CurriculumCourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumCourseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProgramLevelService, useValue: mockProgramLevelService },
      ],
    }).compile();

    service = module.get<CurriculumCourseService>(CurriculumCourseService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the course when found', async () => {
      const course = { id: '1', name: 'Algo', programLevelId: 'pl1' };
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue(course);

      await expect(service.findOne('1')).resolves.toEqual(course);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      programLevelId: 'pl1',
      name: 'Algorithmique',
      code: 'ALGO',
      semester: Semester.S1,
      credits: 6,
    };

    it('creates a course when program level exists and code is free', async () => {
      mockProgramLevelService.findOne.mockResolvedValue({ id: 'pl1' });
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue(null);
      mockPrisma.curriculumCourse.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockProgramLevelService.findOne).toHaveBeenCalledWith('pl1');
      expect(mockPrisma.curriculumCourse.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the program level does not exist', async () => {
      mockProgramLevelService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.curriculumCourse.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the code already exists', async () => {
      mockProgramLevelService.findOne.mockResolvedValue({ id: 'pl1' });
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue({ id: '99', code: 'ALGO' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.curriculumCourse.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the course does not exist', async () => {
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates the new program level when programLevelId changes', async () => {
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue({ id: '1', name: 'Old' });
      mockProgramLevelService.findOne.mockResolvedValue({ id: 'pl2' });
      mockPrisma.curriculumCourse.update.mockResolvedValue({ id: '1', programLevelId: 'pl2' });

      await service.update('1', { programLevelId: 'pl2' });
      expect(mockProgramLevelService.findOne).toHaveBeenCalledWith('pl2');
    });

    it('throws ConflictException when the code belongs to another course', async () => {
      mockPrisma.curriculumCourse.findUnique
        .mockResolvedValueOnce({ id: '1', name: 'Algo', code: 'ALGO' }) // findOne
        .mockResolvedValueOnce({ id: '2', code: 'MATH' }); // ensureCodeIsAvailable

      await expect(service.update('1', { code: 'MATH' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an existing course', async () => {
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.curriculumCourse.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.curriculumCourse.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('throws NotFoundException when deleting a missing course', async () => {
      mockPrisma.curriculumCourse.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.curriculumCourse.delete).not.toHaveBeenCalled();
    });
  });
});
