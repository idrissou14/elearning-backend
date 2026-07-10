import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  EnrollmentType,
  Role,
} from '../../generated/prisma/enums';
import { ClassGroupService } from '../class-group/class-group.service';
import { CrossDbConsistencyService } from '../consistency/cross-db-consistency.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly classGroupService: ClassGroupService,
    private readonly crossDb: CrossDbConsistencyService,
  ) {}

  findAll(filters?: {
    userId?: string;
    classGroupId?: string;
    courseInstanceId?: string;
    academicYear?: string;
    type?: EnrollmentType;
    status?: EnrollmentStatus;
  }) {
    return this.prisma.enrollment.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.classGroupId && { classGroupId: filters.classGroupId }),
        ...(filters?.courseInstanceId && {
          courseInstanceId: filters.courseInstanceId,
        }),
        ...(filters?.academicYear && { academicYear: filters.academicYear }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });
    if (!enrollment) throw new NotFoundException(`Enrollment ${id} not found`);
    return enrollment;
  }

  async create(dto: CreateEnrollmentDto) {
    await this.ensureUserIsStudent(dto.userId);
    if (dto.previousEnrollmentId) await this.findOne(dto.previousEnrollmentId);

    return (dto.type ?? EnrollmentType.CURSUS) === EnrollmentType.RENFORCEMENT
      ? this.createReinforcement(dto)
      : this.createCursus(dto);
  }

  /** Inscription pleine : l'étudiant rejoint tout un ClassGroup. */
  private async createCursus(dto: CreateEnrollmentDto) {
    if (!dto.classGroupId) {
      throw new BadRequestException(
        'classGroupId is required for a CURSUS enrollment',
      );
    }
    if (!dto.academicYear) {
      throw new BadRequestException(
        'academicYear is required for a CURSUS enrollment',
      );
    }
    await this.classGroupService.findOne(dto.classGroupId);
    await this.ensureNoCursusYet(dto.userId, dto.academicYear);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId: dto.userId,
        type: EnrollmentType.CURSUS,
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        status: dto.status,
        previousEnrollmentId: dto.previousEnrollmentId,
      },
    });

    // SAGA-03 — initialise learner progress across the whole class group.
    // Non-blocking by design: Mongo failures are queued for reconciliation.
    if (enrollment.status === EnrollmentStatus.ACTIVE) {
      await this.crossDb.initEnrollmentProgress({
        userId: enrollment.userId,
        classGroupId: dto.classGroupId,
      });
    }

    return enrollment;
  }

  /** Renforcement : l'étudiant s'inscrit à une seule matière (CourseInstance). */
  private async createReinforcement(dto: CreateEnrollmentDto) {
    if (!dto.courseInstanceId) {
      throw new BadRequestException(
        'courseInstanceId is required for a RENFORCEMENT enrollment',
      );
    }

    const instance = await this.prisma.courseInstance.findUnique({
      where: { id: dto.courseInstanceId },
      select: { id: true, academicYear: true },
    });
    if (!instance) {
      throw new NotFoundException(
        `Course instance ${dto.courseInstanceId} not found`,
      );
    }

    await this.ensureNotAlreadyReinforcing(dto.userId, instance.id);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId: dto.userId,
        type: EnrollmentType.RENFORCEMENT,
        courseInstanceId: instance.id,
        // L'année académique du renforcement suit celle de la matière.
        academicYear: instance.academicYear,
        status: dto.status,
        previousEnrollmentId: dto.previousEnrollmentId,
      },
    });

    // SAGA-03 (variante matière) — progression LMS pour cette seule matière.
    if (enrollment.status === EnrollmentStatus.ACTIVE) {
      await this.crossDb.initCourseProgress({
        userId: enrollment.userId,
        courseInstanceId: instance.id,
      });
    }

    return enrollment;
  }

  async update(id: string, dto: UpdateEnrollmentDto) {
    const current = await this.findOne(id);

    if (dto.userId) await this.ensureUserIsStudent(dto.userId);
    if (dto.classGroupId)
      await this.classGroupService.findOne(dto.classGroupId);
    if (dto.previousEnrollmentId) {
      if (dto.previousEnrollmentId === id) {
        throw new BadRequestException(
          'An enrollment cannot reference itself as previous',
        );
      }
      await this.findOne(dto.previousEnrollmentId);
    }

    // La règle « 1 cursus par année » ne concerne que les inscriptions CURSUS.
    if (current.type === EnrollmentType.CURSUS) {
      const userId = dto.userId ?? current.userId;
      const academicYear = dto.academicYear ?? current.academicYear;
      await this.ensureNoCursusYet(userId, academicYear, id);
    }

    return this.prisma.enrollment.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.enrollment.delete({ where: { id } });
  }

  private async ensureUserIsStudent(userId: string) {
    const user = await this.userService.findOne(userId);
    if (user.role !== Role.STUDENT) {
      throw new BadRequestException(`User ${userId} is not a student`);
    }
  }

  /** At most one CURSUS enrollment per student and per academic year. */
  private async ensureNoCursusYet(
    userId: string,
    academicYear: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { userId, academicYear, type: EnrollmentType.CURSUS },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `User ${userId} is already enrolled for ${academicYear}`,
      );
    }
  }

  /** At most one RENFORCEMENT enrollment per student and per course instance. */
  private async ensureNotAlreadyReinforcing(
    userId: string,
    courseInstanceId: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { userId, courseInstanceId, type: EnrollmentType.RENFORCEMENT },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `User ${userId} is already enrolled in course instance ${courseInstanceId}`,
      );
    }
  }
}
