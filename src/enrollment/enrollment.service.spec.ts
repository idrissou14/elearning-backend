import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentStatus, Role } from '../../generated/prisma/enums';
import { ClassGroupService } from '../class-group/class-group.service';
import { CrossDbConsistencyService } from '../consistency/cross-db-consistency.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { EnrollmentService } from './enrollment.service';

const mockPrisma = {
  enrollment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockUserService = { findOne: jest.fn() };
const mockClassGroupService = { findOne: jest.fn() };
const mockCrossDb = { initEnrollmentProgress: jest.fn() };

describe('EnrollmentService', () => {
  let service: EnrollmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserService, useValue: mockUserService },
        { provide: ClassGroupService, useValue: mockClassGroupService },
        { provide: CrossDbConsistencyService, useValue: mockCrossDb },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the enrollment when found', async () => {
      const enrollment = { id: '1', userId: 'u1', academicYear: '2025-2026' };
      mockPrisma.enrollment.findUnique.mockResolvedValue(enrollment);

      await expect(service.findOne('1')).resolves.toEqual(enrollment);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { userId: 'u1', classGroupId: 'g1', academicYear: '2025-2026' };

    it('enrolls a student when user is a student, group exists and no duplicate', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 'u1', role: Role.STUDENT });
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g1' });
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockPrisma.enrollment.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockUserService.findOne).toHaveBeenCalledWith('u1');
      expect(mockClassGroupService.findOne).toHaveBeenCalledWith('g1');
      expect(mockPrisma.enrollment.create).toHaveBeenCalledWith({ data: dto });
    });

    it('triggers SAGA-03 progress init for an active enrollment', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 'u1', role: Role.STUDENT });
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g1' });
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockPrisma.enrollment.create.mockResolvedValue({
        id: '1',
        ...dto,
        status: EnrollmentStatus.ACTIVE,
      });

      await service.create(dto);

      expect(mockCrossDb.initEnrollmentProgress).toHaveBeenCalledWith({
        userId: 'u1',
        classGroupId: 'g1',
      });
    });

    it('throws BadRequestException when the user is not a student', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 'u1', role: Role.TEACHER });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockClassGroupService.findOne).not.toHaveBeenCalled();
      expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the class group is missing', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 'u1', role: Role.STUDENT });
      mockClassGroupService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('validates the previous enrollment when provided', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 'u1', role: Role.STUDENT });
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g1' });
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'prev' }); // previous lookup
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockPrisma.enrollment.create.mockResolvedValue({ id: '1' });

      await service.create({ ...dto, previousEnrollmentId: 'prev' });
      expect(mockPrisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: { id: 'prev' },
      });
    });

    it('throws ConflictException when the user is already enrolled that year', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 'u1', role: Role.STUDENT });
      mockClassGroupService.findOne.mockResolvedValue({ id: 'g1' });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: '99' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the enrollment does not exist', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { status: EnrollmentStatus.COMPLETED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when referencing itself as previous', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        academicYear: '2025-2026',
      });

      await expect(
        service.update('1', { previousEnrollmentId: '1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the status of an existing enrollment', async () => {
      const current = { id: '1', userId: 'u1', academicYear: '2025-2026' };
      mockPrisma.enrollment.findUnique.mockResolvedValue(current);
      mockPrisma.enrollment.findFirst.mockResolvedValue(current); // same record
      mockPrisma.enrollment.update.mockResolvedValue({
        ...current,
        status: EnrollmentStatus.COMPLETED,
      });

      await service.update('1', { status: EnrollmentStatus.COMPLETED });
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: EnrollmentStatus.COMPLETED },
      });
    });
  });

  describe('remove', () => {
    it('deletes an existing enrollment', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.enrollment.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.enrollment.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing enrollment', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.enrollment.delete).not.toHaveBeenCalled();
    });
  });
});
