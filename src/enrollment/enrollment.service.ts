import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, Role } from '../../generated/prisma/enums';
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
    academicYear?: string;
    status?: EnrollmentStatus;
  }) {
    return this.prisma.enrollment.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.classGroupId && { classGroupId: filters.classGroupId }),
        ...(filters?.academicYear && { academicYear: filters.academicYear }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) throw new NotFoundException(`Enrollment ${id} not found`);
    return enrollment;
  }

  async create(dto: CreateEnrollmentDto) {
    await this.ensureUserIsStudent(dto.userId);
    await this.classGroupService.findOne(dto.classGroupId);
    if (dto.previousEnrollmentId) await this.findOne(dto.previousEnrollmentId);
    await this.ensureNotAlreadyEnrolled(dto.userId, dto.academicYear);

    const enrollment = await this.prisma.enrollment.create({ data: dto });

    // SAGA-03 — initialise learner progress for an active enrollment.
    // Non-blocking by design: Mongo failures are queued for reconciliation.
    if (enrollment.status === EnrollmentStatus.ACTIVE) {
      await this.crossDb.initEnrollmentProgress({
        userId: enrollment.userId,
        classGroupId: enrollment.classGroupId,
      });
    }

    return enrollment;
  }

  async update(id: string, dto: UpdateEnrollmentDto) {
    const current = await this.findOne(id);

    if (dto.userId) await this.ensureUserIsStudent(dto.userId);
    if (dto.classGroupId) await this.classGroupService.findOne(dto.classGroupId);
    if (dto.previousEnrollmentId) {
      if (dto.previousEnrollmentId === id) {
        throw new BadRequestException('An enrollment cannot reference itself as previous');
      }
      await this.findOne(dto.previousEnrollmentId);
    }

    const userId = dto.userId ?? current.userId;
    const academicYear = dto.academicYear ?? current.academicYear;
    await this.ensureNotAlreadyEnrolled(userId, academicYear, id);

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

  private async ensureNotAlreadyEnrolled(
    userId: string,
    academicYear: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { userId, academicYear },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `User ${userId} is already enrolled for ${academicYear}`,
      );
    }
  }
}
