import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DepartementService } from '../departement/departement.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramService } from './program.service';

const mockPrisma = {
  program: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockDepartementService = {
  findOne: jest.fn(),
};

describe('ProgramService', () => {
  let service: ProgramService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DepartementService, useValue: mockDepartementService },
      ],
    }).compile();

    service = module.get<ProgramService>(ProgramService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the program when found', async () => {
      const program = { id: '1', name: 'Licence Info', departmentId: 'd1' };
      mockPrisma.program.findUnique.mockResolvedValue(program);

      await expect(service.findOne('1')).resolves.toEqual(program);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.program.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { departmentId: 'd1', name: 'Licence Info', code: 'LIC' };

    it('creates a program when department exists and code is free', async () => {
      mockDepartementService.findOne.mockResolvedValue({ id: 'd1' });
      mockPrisma.program.findUnique.mockResolvedValue(null);
      mockPrisma.program.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockDepartementService.findOne).toHaveBeenCalledWith('d1');
      expect(mockPrisma.program.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the department does not exist', async () => {
      mockDepartementService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.program.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the code already exists', async () => {
      mockDepartementService.findOne.mockResolvedValue({ id: 'd1' });
      mockPrisma.program.findUnique.mockResolvedValue({ id: '99', code: 'LIC' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.program.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the program does not exist', async () => {
      mockPrisma.program.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates the new department when departmentId changes', async () => {
      mockPrisma.program.findUnique.mockResolvedValue({ id: '1', name: 'Old' });
      mockDepartementService.findOne.mockResolvedValue({ id: 'd2' });
      mockPrisma.program.update.mockResolvedValue({ id: '1', departmentId: 'd2' });

      await service.update('1', { departmentId: 'd2' });
      expect(mockDepartementService.findOne).toHaveBeenCalledWith('d2');
    });

    it('throws ConflictException when the code belongs to another program', async () => {
      mockPrisma.program.findUnique
        .mockResolvedValueOnce({ id: '1', name: 'Licence', code: 'LIC' }) // findOne
        .mockResolvedValueOnce({ id: '2', code: 'MAS' }); // ensureCodeIsAvailable

      await expect(service.update('1', { code: 'MAS' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an existing program', async () => {
      mockPrisma.program.findUnique.mockResolvedValue({ id: '1', name: 'Licence' });
      mockPrisma.program.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.program.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing program', async () => {
      mockPrisma.program.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.program.delete).not.toHaveBeenCalled();
    });
  });
});
