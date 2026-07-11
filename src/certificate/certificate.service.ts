import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, EnrollmentType } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

/** Relations needed to describe what an attestation certifies. */
const ENROLLMENT_CONTEXT_INCLUDE = {
  user: { select: { firstName: true, lastName: true } },
  classGroup: { include: { programLevel: { include: { program: true } } } },
  courseInstance: {
    include: {
      curriculumCourse: { select: { name: true } },
      classGroup: { include: { programLevel: { include: { program: true } } } },
    },
  },
} as const;

interface ClassGroupContext {
  name: string;
  programLevel: { levelName: string; program: { name: string } };
}

interface EnrollmentContextSource {
  type: EnrollmentType;
  academicYear: string;
  user: { firstName: string; lastName: string };
  classGroup: ClassGroupContext | null;
  courseInstance: {
    curriculumCourse: { name: string };
    classGroup: ClassGroupContext | null;
  } | null;
}

/** What the attestation certifies — a matière for RENFORCEMENT, a cursus otherwise. */
export interface CertificateContext {
  type: EnrollmentType;
  academicYear: string;
  studentName: string;
  programName: string | null;
  levelName: string | null;
  courseName: string | null;
}

@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters?: { enrollmentId?: string }) {
    return this.prisma.certificate.findMany({
      where: {
        ...(filters?.enrollmentId && { enrollmentId: filters.enrollmentId }),
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: { enrollment: { include: ENROLLMENT_CONTEXT_INCLUDE } },
    });
    if (!certificate) throw new NotFoundException(`Certificate ${id} not found`);
    const { enrollment, ...cert } = certificate;
    return { ...cert, context: this.buildContext(enrollment) };
  }

  async verify(verifyToken: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verifyToken },
      include: { enrollment: { include: ENROLLMENT_CONTEXT_INCLUDE } },
    });
    if (!certificate) throw new NotFoundException('Invalid certificate token');
    const { enrollment, ...cert } = certificate;
    return { ...cert, context: this.buildContext(enrollment) };
  }

  async create(dto: CreateCertificateDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: ENROLLMENT_CONTEXT_INCLUDE,
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${dto.enrollmentId} not found`);
    }

    // Déclencheur métier : on n'atteste que d'une inscription terminée
    // (vaut pour une matière de renforcement comme pour un cursus complet).
    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Enrollment must be COMPLETED before a certificate can be issued',
      );
    }

    // Une seule attestation par inscription.
    const existing = await this.prisma.certificate.findFirst({
      where: { enrollmentId: dto.enrollmentId },
    });
    if (existing) {
      throw new ConflictException(
        `A certificate already exists for enrollment ${dto.enrollmentId}`,
      );
    }

    const certificate = await this.prisma.certificate.create({ data: dto });
    return { ...certificate, context: this.buildContext(enrollment) };
  }

  async update(id: string, dto: UpdateCertificateDto) {
    await this.ensureExists(id);
    return this.prisma.certificate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.certificate.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const certificate = await this.prisma.certificate.findUnique({ where: { id } });
    if (!certificate) throw new NotFoundException(`Certificate ${id} not found`);
    return certificate;
  }

  /** Flatten the enrollment into the human-readable subject of the attestation. */
  private buildContext(enrollment: EnrollmentContextSource): CertificateContext {
    // CURSUS → promo directe ; RENFORCEMENT → promo portée par la matière.
    const classGroup =
      enrollment.classGroup ?? enrollment.courseInstance?.classGroup ?? null;
    return {
      type: enrollment.type,
      academicYear: enrollment.academicYear,
      studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      programName: classGroup?.programLevel.program.name ?? null,
      levelName: classGroup?.programLevel.levelName ?? null,
      // Renseigné uniquement pour un renforcement : la matière attestée.
      courseName: enrollment.courseInstance?.curriculumCourse.name ?? null,
    };
  }
}
