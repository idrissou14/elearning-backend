import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateService } from './certificate.service';

const mockPrisma = {
  certificate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEnrollmentService = { findOne: jest.fn() };

describe('CertificateService', () => {
  let service: CertificateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EnrollmentService, useValue: mockEnrollmentService },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the certificate when found', async () => {
      const cert = { id: '1', enrollmentId: 'e1', s3Path: 'path.pdf' };
      mockPrisma.certificate.findUnique.mockResolvedValue(cert);

      await expect(service.findOne('1')).resolves.toEqual(cert);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('returns the certificate for a valid token', async () => {
      const cert = { id: '1', verifyToken: 'tok' };
      mockPrisma.certificate.findUnique.mockResolvedValue(cert);

      await expect(service.verify('tok')).resolves.toEqual(cert);
      expect(mockPrisma.certificate.findUnique).toHaveBeenCalledWith({
        where: { verifyToken: 'tok' },
      });
    });

    it('throws NotFoundException for an invalid token', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.verify('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { enrollmentId: 'e1', s3Path: 'path.pdf' };

    it('creates a certificate when the enrollment exists', async () => {
      mockEnrollmentService.findOne.mockResolvedValue({ id: 'e1' });
      mockPrisma.certificate.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockEnrollmentService.findOne).toHaveBeenCalledWith('e1');
      expect(mockPrisma.certificate.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the enrollment is missing', async () => {
      mockEnrollmentService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.certificate.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.certificate.update.mockResolvedValue({ id: '1', s3Path: 'new.pdf' });

      await service.update('1', { s3Path: 'new.pdf' });
      expect(mockPrisma.certificate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { s3Path: 'new.pdf' },
      });
    });

    it('throws NotFoundException when the certificate does not exist', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
      expect(mockPrisma.certificate.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.certificate.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.certificate.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.certificate.delete).not.toHaveBeenCalled();
    });
  });
});
