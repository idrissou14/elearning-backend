import { Injectable, NotFoundException } from '@nestjs/common';
import { EvaluationType } from '../../generated/prisma/enums';
import { CoursInstanceService } from '../cours-instance/cours-instance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursInstanceService: CoursInstanceService,
  ) {}

  findAll(filters?: { courseInstanceId?: string; type?: EvaluationType }) {
    return this.prisma.evaluation.findMany({
      where: {
        ...(filters?.courseInstanceId && {
          courseInstanceId: filters.courseInstanceId,
        }),
        ...(filters?.type && { type: filters.type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const evaluation = await this.prisma.evaluation.findUnique({ where: { id } });
    if (!evaluation) throw new NotFoundException(`Evaluation ${id} not found`);
    return evaluation;
  }

  async create(dto: CreateEvaluationDto) {
    await this.coursInstanceService.findOne(dto.courseInstanceId);
    return this.prisma.evaluation.create({ data: dto });
  }

  async update(id: string, dto: UpdateEvaluationDto) {
    await this.findOne(id);
    if (dto.courseInstanceId)
      await this.coursInstanceService.findOne(dto.courseInstanceId);
    return this.prisma.evaluation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.evaluation.delete({ where: { id } });
  }
}
