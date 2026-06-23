import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentService: EnrollmentService,
    private readonly evaluationService: EvaluationService,
    private readonly userService: UserService,
  ) {}

  findAll(filters?: { enrollmentId?: string; evaluationId?: string }) {
    return this.prisma.grade.findMany({
      where: {
        ...(filters?.enrollmentId && { enrollmentId: filters.enrollmentId }),
        ...(filters?.evaluationId && { evaluationId: filters.evaluationId }),
      },
      orderBy: { gradedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundException(`Grade ${id} not found`);
    return grade;
  }

  async create(dto: CreateGradeDto) {
    await this.enrollmentService.findOne(dto.enrollmentId);
    const evaluation = await this.evaluationService.findOne(dto.evaluationId);
    this.assertScoreWithinMax(dto.score, Number(evaluation.maxScore));
    if (dto.gradedBy) await this.ensureUserCanGrade(dto.gradedBy);
    await this.ensureNotAlreadyGraded(dto.enrollmentId, dto.evaluationId);
    return this.prisma.grade.create({ data: dto });
  }

  async update(id: string, dto: UpdateGradeDto) {
    const current = await this.findOne(id);

    if (dto.enrollmentId) await this.enrollmentService.findOne(dto.enrollmentId);
    if (dto.gradedBy) await this.ensureUserCanGrade(dto.gradedBy);

    const evaluationId = dto.evaluationId ?? current.evaluationId;
    if (dto.score !== undefined || dto.evaluationId) {
      const evaluation = await this.evaluationService.findOne(evaluationId);
      const score = dto.score ?? Number(current.score);
      this.assertScoreWithinMax(score, Number(evaluation.maxScore));
    }

    const enrollmentId = dto.enrollmentId ?? current.enrollmentId;
    await this.ensureNotAlreadyGraded(enrollmentId, evaluationId, id);

    return this.prisma.grade.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.grade.delete({ where: { id } });
  }

  private assertScoreWithinMax(score: number, maxScore: number) {
    if (score > maxScore) {
      throw new BadRequestException(`score cannot exceed the maximum of ${maxScore}`);
    }
  }

  private async ensureUserCanGrade(userId: string) {
    const user = await this.userService.findOne(userId);
    if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
      throw new BadRequestException(`User ${userId} is not allowed to grade`);
    }
  }

  private async ensureNotAlreadyGraded(
    enrollmentId: string,
    evaluationId: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.grade.findFirst({
      where: { enrollmentId, evaluationId },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'A grade already exists for this enrollment and evaluation',
      );
    }
  }
}
