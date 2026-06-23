import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramLevelService } from '../program-level/program-level.service';
import { ClassGroupService } from './class-group.service';

const mockPrisma = {
  classGroup: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockProgramLevelService = {
  findOne: jest.fn(),
};

describe('ClassGroupService', () => {
  let service: ClassGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassGroupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProgramLevelService, useValue: mockProgramLevelService },
      ],
    }).compile();

    service = module.get<ClassGroupService>(ClassGroupService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the group when found', async () => {
      const group = { id: '1', name: 'Groupe A', programLevelId: 'pl1' };
      mockPrisma.classGroup.findUnique.mockResolvedValue(group);

      await expect(service.findOne('1')).resolves.toEqual(group);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.classGroup.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      programLevelId: 'pl1',
      name: 'Groupe A',
      academicYear: '2025-2026',
      status: ClassStatus.DRAFT,
    };

    it('creates a group when level exists and name is free', async () => {
      mockProgramLevelService.findOne.mockResolvedValue({ id: 'pl1' });
      mockPrisma.classGroup.findFirst.mockResolvedValue(null);
      mockPrisma.classGroup.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockProgramLevelService.findOne).toHaveBeenCalledWith('pl1');
      expect(mockPrisma.classGroup.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the program level does not exist', async () => {
      mockProgramLevelService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.classGroup.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate name in the same level/year', async () => {
      mockProgramLevelService.findOne.mockResolvedValue({ id: 'pl1' });
      mockPrisma.classGroup.findFirst.mockResolvedValue({ id: '99', name: 'Groupe A' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.classGroup.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the group does not exist', async () => {
      mockPrisma.classGroup.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('uses existing fields when not provided for the uniqueness check', async () => {
      const current = {
        id: '1',
        programLevelId: 'pl1',
        name: 'Groupe A',
        academicYear: '2025-2026',
      };
      mockPrisma.classGroup.findUnique.mockResolvedValue(current);
      mockPrisma.classGroup.findFirst.mockResolvedValue(current); // same record, allowed
      mockPrisma.classGroup.update.mockResolvedValue({ ...current, status: 'ACTIVE' });

      await service.update('1', { status: ClassStatus.ACTIVE });
      expect(mockPrisma.classGroup.findFirst).toHaveBeenCalledWith({
        where: { programLevelId: 'pl1', name: 'Groupe A', academicYear: '2025-2026' },
      });
    });

    it('throws ConflictException when renaming to an existing group', async () => {
      mockPrisma.classGroup.findUnique.mockResolvedValue({
        id: '1',
        programLevelId: 'pl1',
        name: 'Groupe A',
        academicYear: '2025-2026',
      });
      mockPrisma.classGroup.findFirst.mockResolvedValue({ id: '2', name: 'Groupe B' });

      await expect(service.update('1', { name: 'Groupe B' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an existing group', async () => {
      mockPrisma.classGroup.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.classGroup.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.classGroup.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing group', async () => {
      mockPrisma.classGroup.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.classGroup.delete).not.toHaveBeenCalled();
    });
  });
});
