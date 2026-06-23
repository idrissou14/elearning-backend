import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartementDto } from './dto/create-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';

@Injectable()
export class DepartementService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const departement = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!departement) throw new NotFoundException(`Department ${id} not found`);
    return departement;
  }

  async create(dto: CreateDepartementDto) {
    await this.ensureCodeIsAvailable(dto.code);
    return this.prisma.department.create({ data: dto });
  }

  async update(id: string, dto: UpdateDepartementDto) {
    await this.findOne(id);
    await this.ensureCodeIsAvailable(dto.code, id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.department.delete({ where: { id } });
  }

  private async ensureCodeIsAvailable(code?: string, excludeId?: string) {
    if (!code) return;
    const existing = await this.prisma.department.findUnique({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Department code "${code}" already in use`);
    }
  }
}
