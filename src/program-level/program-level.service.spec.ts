import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramService } from '../program/program.service';
import { ProgramLevelService } from './program-level.service';

const mockPrisma = {
  programLevel: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockProgramService = {
  findOne: jest.fn(),
};

describe('ProgramLevelService', () => {
  let service: ProgramLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramLevelService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProgramService, useValue: mockProgramService },
      ],
    }).compile();

    service = module.get<ProgramLevelService>(ProgramLevelService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the level when found', async () => {
      const level = { id: '1', programId: 'p1', levelName: 'L1', levelOrder: 1 };
      mockPrisma.programLevel.findUnique.mockResolvedValue(level);

      await expect(service.findOne('1')).resolves.toEqual(level);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.programLevel.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { programId: 'p1', levelName: 'L1', levelOrder: 1 };

    it('creates a level when program exists and name is free', async () => {
      mockProgramService.findOne.mockResolvedValue({ id: 'p1' });
      mockPrisma.programLevel.findFirst.mockResolvedValue(null);
      mockPrisma.programLevel.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockProgramService.findOne).toHaveBeenCalledWith('p1');
      expect(mockPrisma.programLevel.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the program does not exist', async () => {
      mockProgramService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.programLevel.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the level name already exists in the program', async () => {
      mockProgramService.findOne.mockResolvedValue({ id: 'p1' });
      mockPrisma.programLevel.findFirst.mockResolvedValue({ id: '99', levelName: 'L1' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.programLevel.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the level does not exist', async () => {
      mockPrisma.programLevel.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { levelName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('uses the existing program/name when not provided in the update', async () => {
      const current = { id: '1', programId: 'p1', levelName: 'L1', levelOrder: 1 };
      mockPrisma.programLevel.findUnique.mockResolvedValue(current);
      mockPrisma.programLevel.findFirst.mockResolvedValue(current); // same record, allowed
      mockPrisma.programLevel.update.mockResolvedValue({ ...current, levelOrder: 2 });

      await service.update('1', { levelOrder: 2 });
      expect(mockPrisma.programLevel.findFirst).toHaveBeenCalledWith({
        where: { programId: 'p1', levelName: 'L1' },
      });
    });

    it('throws ConflictException when renaming to an existing level name', async () => {
      mockPrisma.programLevel.findUnique.mockResolvedValue({
        id: '1',
        programId: 'p1',
        levelName: 'L1',
        levelOrder: 1,
      });
      mockPrisma.programLevel.findFirst.mockResolvedValue({ id: '2', levelName: 'L2' });

      await expect(service.update('1', { levelName: 'L2' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an existing level', async () => {
      mockPrisma.programLevel.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.programLevel.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.programLevel.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing level', async () => {
      mockPrisma.programLevel.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.programLevel.delete).not.toHaveBeenCalled();
    });
  });
});
