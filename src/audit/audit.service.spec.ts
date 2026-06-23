import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

const mockPrisma = {
  auditLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('applies filters and a date range', () => {
      mockPrisma.auditLog.findMany.mockReturnValue([]);

      service.findAll({
        actorId: 'a1',
        action: 'POST /user',
        resourceType: 'user',
        from: '2026-01-01',
        to: '2026-12-31',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          actorId: 'a1',
          action: 'POST /user',
          resourceType: 'user',
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });

    it('omits the date range when no dates are given', () => {
      mockPrisma.auditLog.findMany.mockReturnValue([]);

      service.findAll({ actorId: 'a1' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorId: 'a1' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });
  });

  describe('findOne', () => {
    it('returns the log when found', async () => {
      const log = { id: '1', action: 'POST /user' };
      mockPrisma.auditLog.findUnique.mockResolvedValue(log);

      await expect(service.findOne('1')).resolves.toEqual(log);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('record', () => {
    it('normalises optional fields to null and includes payload when present', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: '1' });

      await service.record({
        action: 'POST /user',
        actorId: 'a1',
        payload: { name: 'x' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'a1',
          actorEmail: null,
          action: 'POST /user',
          resourceType: null,
          resourceId: null,
          ipAddress: null,
          userAgent: null,
          payload: { name: 'x' },
        },
      });
    });

    it('omits payload when undefined', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: '1' });

      await service.record({ action: 'DELETE /user' });

      const data = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('payload');
    });
  });
});
