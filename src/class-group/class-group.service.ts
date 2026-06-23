import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramLevelService } from '../program-level/program-level.service';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';

@Injectable()
export class ClassGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programLevelService: ProgramLevelService,
  ) {}

  findAll(filters?: {
    programLevelId?: string;
    academicYear?: string;
    status?: ClassStatus;
  }) {
    return this.prisma.classGroup.findMany({
      where: {
        ...(filters?.programLevelId && { programLevelId: filters.programLevelId }),
        ...(filters?.academicYear && { academicYear: filters.academicYear }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.classGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Class group ${id} not found`);
    return group;
  }

  async create(dto: CreateClassGroupDto) {
    await this.programLevelService.findOne(dto.programLevelId);
    await this.ensureNameIsAvailable(dto.programLevelId, dto.name, dto.academicYear);
    return this.prisma.classGroup.create({ data: dto });
  }

  async update(id: string, dto: UpdateClassGroupDto) {
    const current = await this.findOne(id);
    if (dto.programLevelId) await this.programLevelService.findOne(dto.programLevelId);

    const programLevelId = dto.programLevelId ?? current.programLevelId;
    const name = dto.name ?? current.name;
    const academicYear = dto.academicYear ?? current.academicYear;
    await this.ensureNameIsAvailable(programLevelId, name, academicYear, id);

    return this.prisma.classGroup.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.classGroup.delete({ where: { id } });
  }

  private async ensureNameIsAvailable(
    programLevelId: string,
    name: string,
    academicYear: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.classGroup.findFirst({
      where: { programLevelId, name, academicYear },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Class group "${name}" already exists for this level and academic year`,
      );
    }
  }
}
