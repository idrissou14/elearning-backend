import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassGroupService } from '../class-group/class-group.service';
import { CurriculumCourseService } from '../curriculum-course/curriculum-course.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoursInstanceService } from './cours-instance.service';

const mockPrisma = {
  courseInstance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCurriculumCourseService = { findOne: jest.fn() };
const mockClassGroupService = { findOne: jest.fn() };

describe('CoursInstanceService', () => {
  let service: CoursInstanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursInstanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CurriculumCourseService, useValue: mockCurriculumCourseService },
        { provide: ClassGroupService, useValue: mockClassGroupService },
      ],
    }).compile();

    service = module.get<CoursInstanceService>(CoursInstanceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the instance when found', async () => {
      const instance = { id: '1', curriculumCourseId: 'c1', classGroupId: 'g1' };
      mockPrisma.courseInstance.findUnique.mockResolvedValue(instance);

      await expect(service.findOne('1')).resolves.toEqual(instance);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      curriculumCourseId: 'c1',
      classGroupId: 'g1',
      academicYear: '2025-2026',
    };

    it('creates an instance when both parents exist and the tuple is unique', async () => {
      mockCurriculumCourseService.findOne.mockResolvedValue({ id: 'c1' });
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g1' });
      mockPrisma.courseInstance.findFirst.mockResolvedValue(null);
      mockPrisma.courseInstance.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockCurriculumCourseService.findOne).toHaveBeenCalledWith('c1');
      expect(mockClassGroupService.findOne).toHaveBeenCalledWith('g1');
      expect(mockPrisma.courseInstance.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the curriculum course is missing', async () => {
      mockCurriculumCourseService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockClassGroupService.findOne).not.toHaveBeenCalled();
      expect(mockPrisma.courseInstance.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the class group is missing', async () => {
      mockCurriculumCourseService.findOne.mockResolvedValue({ id: 'c1' });
      mockClassGroupService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.courseInstance.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the tuple already exists', async () => {
      mockCurriculumCourseService.findOne.mockResolvedValue({ id: 'c1' });
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g1' });
      mockPrisma.courseInstance.findFirst.mockResolvedValue({ id: '99' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.courseInstance.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the instance does not exist', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { academicYear: '2026-2027' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates a changed class group and re-checks uniqueness with existing fields', async () => {
      const current = {
        id: '1',
        curriculumCourseId: 'c1',
        classGroupId: 'g1',
        academicYear: '2025-2026',
      };
      mockPrisma.courseInstance.findUnique.mockResolvedValue(current);
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g2' });
      mockPrisma.courseInstance.findFirst.mockResolvedValue(current); // same record
      mockPrisma.courseInstance.update.mockResolvedValue({
        ...current,
        classGroupId: 'g2',
      });

      await service.update('1', { classGroupId: 'g2' });
      expect(mockClassGroupService.findOne).toHaveBeenCalledWith('g2');
      expect(mockPrisma.courseInstance.findFirst).toHaveBeenCalledWith({
        where: {
          curriculumCourseId: 'c1',
          classGroupId: 'g2',
          academicYear: '2025-2026',
        },
      });
    });

    it('throws ConflictException when the new tuple collides with another instance', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({
        id: '1',
        curriculumCourseId: 'c1',
        classGroupId: 'g1',
        academicYear: '2025-2026',
      });
      mockPrisma.courseInstance.findFirst.mockResolvedValue({ id: '2' });

      await expect(
        service.update('1', { academicYear: '2026-2027' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes an existing instance', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.courseInstance.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.courseInstance.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('throws NotFoundException when deleting a missing instance', async () => {
      mockPrisma.courseInstance.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.courseInstance.delete).not.toHaveBeenCalled();
    });
  });
});
