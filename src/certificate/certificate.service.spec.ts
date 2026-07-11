import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateService } from './certificate.service';

const mockPrisma = {
  certificate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  enrollment: {
    findUnique: jest.fn(),
  },
};

const classGroup = {
  name: 'L1 A',
  programLevel: { levelName: 'L1', program: { name: 'Informatique' } },
};
const enrollmentCursus = {
  id: 'e1',
  type: 'CURSUS',
  status: 'COMPLETED',
  academicYear: '2025-2026',
  user: { firstName: 'Awa', lastName: 'Diop' },
  classGroup,
  courseInstance: null,
};
const enrollmentRenforcement = {
  id: 'e2',
  type: 'RENFORCEMENT',
  status: 'COMPLETED',
  academicYear: '2025-2026',
  user: { firstName: 'Awa', lastName: 'Diop' },
  classGroup: null,
  courseInstance: { curriculumCourse: { name: 'Algorithmique' }, classGroup },
};

describe('CertificateService', () => {
  let service: CertificateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the certificate with its cursus context', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: '1',
        enrollmentId: 'e1',
        s3Path: 'path.pdf',
        enrollment: enrollmentCursus,
      });

      const result = await service.findOne('1');
      expect(result).toMatchObject({ id: '1', enrollmentId: 'e1', s3Path: 'path.pdf' });
      expect(result.context).toEqual({
        type: 'CURSUS',
        academicYear: '2025-2026',
        studentName: 'Awa Diop',
        programName: 'Informatique',
        levelName: 'L1',
        courseName: null,
      });
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('returns the certificate with its matière context for a renforcement', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: '1',
        verifyToken: 'tok',
        enrollment: enrollmentRenforcement,
      });

      const result = await service.verify('tok');
      expect(result.context).toEqual({
        type: 'RENFORCEMENT',
        academicYear: '2025-2026',
        studentName: 'Awa Diop',
        programName: 'Informatique',
        levelName: 'L1',
        courseName: 'Algorithmique',
      });
    });

    it('throws NotFoundException for an invalid token', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.verify('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { enrollmentId: 'e2', s3Path: 'path.pdf' };

    it('issues a certificate for a COMPLETED enrollment and returns its context', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(enrollmentRenforcement);
      mockPrisma.certificate.findFirst.mockResolvedValue(null);
      mockPrisma.certificate.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);
      expect(result).toMatchObject({ id: '1', ...dto });
      expect(result.context.courseName).toBe('Algorithmique');
      expect(mockPrisma.certificate.create).toHaveBeenCalledWith({ data: dto });
    });

    it('throws NotFoundException when the enrollment is missing', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.certificate.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the enrollment is not COMPLETED', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        ...enrollmentRenforcement,
        status: 'ACTIVE',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.certificate.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a certificate already exists', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(enrollmentRenforcement);
      mockPrisma.certificate.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
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
