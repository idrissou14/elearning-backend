import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DepartementService } from '../departement/departement.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@Injectable()
export class ProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departementService: DepartementService,
  ) {}

  findAll(filters?: { departmentId?: string }) {
    return this.prisma.program.findMany({
      where: {
        ...(filters?.departmentId && { departmentId: filters.departmentId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.program.findUnique({ where: { id } });
    if (!program) throw new NotFoundException(`Program ${id} not found`);
    return program;
  }

  async create(dto: CreateProgramDto) {
    await this.departementService.findOne(dto.departmentId);
    await this.ensureCodeIsAvailable(dto.code);
    return this.prisma.program.create({ data: dto });
  }

  async update(id: string, dto: UpdateProgramDto) {
    await this.findOne(id);
    if (dto.departmentId) await this.departementService.findOne(dto.departmentId);
    await this.ensureCodeIsAvailable(dto.code, id);
    return this.prisma.program.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.program.delete({ where: { id } });
  }

  private async ensureCodeIsAvailable(code?: string, excludeId?: string) {
    if (!code) return;
    const existing = await this.prisma.program.findUnique({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Program code "${code}" already in use`);
    }
  }
}
