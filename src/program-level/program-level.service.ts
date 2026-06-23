import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramService } from '../program/program.service';
import { CreateProgramLevelDto } from './dto/create-program-level.dto';
import { UpdateProgramLevelDto } from './dto/update-program-level.dto';

@Injectable()
export class ProgramLevelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programService: ProgramService,
  ) {}

  findAll(filters?: { programId?: string }) {
    return this.prisma.programLevel.findMany({
      where: {
        ...(filters?.programId && { programId: filters.programId }),
      },
      orderBy: { levelOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const level = await this.prisma.programLevel.findUnique({ where: { id } });
    if (!level) throw new NotFoundException(`Program level ${id} not found`);
    return level;
  }

  async create(dto: CreateProgramLevelDto) {
    await this.programService.findOne(dto.programId);
    await this.ensureNameIsAvailable(dto.programId, dto.levelName);
    return this.prisma.programLevel.create({ data: dto });
  }

  async update(id: string, dto: UpdateProgramLevelDto) {
    const current = await this.findOne(id);
    if (dto.programId) await this.programService.findOne(dto.programId);

    const programId = dto.programId ?? current.programId;
    const levelName = dto.levelName ?? current.levelName;
    await this.ensureNameIsAvailable(programId, levelName, id);

    return this.prisma.programLevel.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.programLevel.delete({ where: { id } });
  }

  private async ensureNameIsAvailable(
    programId: string,
    levelName: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.programLevel.findFirst({
      where: { programId, levelName },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Level "${levelName}" already exists for this program`,
      );
    }
  }
}
