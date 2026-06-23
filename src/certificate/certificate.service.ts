import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  findAll(filters?: { enrollmentId?: string }) {
    return this.prisma.certificate.findMany({
      where: {
        ...(filters?.enrollmentId && { enrollmentId: filters.enrollmentId }),
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const certificate = await this.prisma.certificate.findUnique({ where: { id } });
    if (!certificate) throw new NotFoundException(`Certificate ${id} not found`);
    return certificate;
  }

  async verify(verifyToken: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verifyToken },
    });
    if (!certificate) throw new NotFoundException('Invalid certificate token');
    return certificate;
  }

  async create(dto: CreateCertificateDto) {
    await this.enrollmentService.findOne(dto.enrollmentId);
    return this.prisma.certificate.create({ data: dto });
  }

  async update(id: string, dto: UpdateCertificateDto) {
    await this.findOne(id);
    return this.prisma.certificate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.certificate.delete({ where: { id } });
  }
}
