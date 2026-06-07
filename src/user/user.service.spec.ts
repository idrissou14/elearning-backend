jest.mock('../prisma/prisma.service');

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('filters out soft-deleted users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the user when found', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockPrisma.user.findFirst.mockResolvedValue(user);
      expect(await service.findOne('1')).toEqual(user);
    });
  });

  describe('create', () => {
    it('throws ConflictException when email is taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      const dto: CreateUserDto = {
        email: 'taken@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('hashes the password and excludes plain text', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '1', email: 'new@example.com' });
      const dto: CreateUserDto = {
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        password: 'secret123',
      };
      await service.create(dto);
      const { data } = mockPrisma.user.create.mock.calls[0][0];
      expect(data).not.toHaveProperty('password');
      expect(data.passwordHash).toBeDefined();
      expect(await bcrypt.compare('secret123', data.passwordHash)).toBe(true);
    });
  });

  describe('update', () => {
    it('throws NotFoundException for unknown id', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.update('bad-id', { firstName: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.user.update.mockResolvedValue({ id: '1' });
      await service.remove('1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
