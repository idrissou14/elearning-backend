import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DepartementService } from './departement.service';

const mockPrisma = {
  department: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('DepartementService', () => {
  let service: DepartementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DepartementService>(DepartementService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the department when found', async () => {
      const dept = { id: '1', name: 'GI', code: 'GI' };
      mockPrisma.department.findUnique.mockResolvedValue(dept);

      await expect(service.findOne('1')).resolves.toEqual(dept);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a department when the code is free', async () => {
      const dto = { name: 'Génie Informatique', code: 'GI' };
      mockPrisma.department.findUnique.mockResolvedValue(null);
      mockPrisma.department.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockPrisma.department.create).toHaveBeenCalledWith({ data: dto });
    });

    it('throws ConflictException when the code already exists', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({ id: '99', code: 'GI' });

      await expect(service.create({ name: 'X', code: 'GI' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.department.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the department does not exist', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows keeping the same code on the same department', async () => {
      const existing = { id: '1', name: 'GI', code: 'GI' };
      mockPrisma.department.findUnique
        .mockResolvedValueOnce(existing) // findOne
        .mockResolvedValueOnce(existing); // ensureCodeIsAvailable
      mockPrisma.department.update.mockResolvedValue({ ...existing, name: 'GI v2' });

      await expect(service.update('1', { name: 'GI v2', code: 'GI' })).resolves.toEqual(
        { ...existing, name: 'GI v2' },
      );
    });

    it('throws ConflictException when the code belongs to another department', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce({ id: '1', name: 'GI', code: 'GI' }) // findOne
        .mockResolvedValueOnce({ id: '2', code: 'GE' }); // ensureCodeIsAvailable

      await expect(service.update('1', { code: 'GE' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an existing department', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({ id: '1', name: 'GI' });
      mockPrisma.department.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.department.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing department', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.department.delete).not.toHaveBeenCalled();
    });
  });
});
