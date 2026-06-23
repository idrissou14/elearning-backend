import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Semester } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramLevelService } from '../program-level/program-level.service';
import { CreateCurriculumCourseDto } from './dto/create-curriculum-course.dto';
import { UpdateCurriculumCourseDto } from './dto/update-curriculum-course.dto';

@Injectable()
export class CurriculumCourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programLevelService: ProgramLevelService,
  ) {}

  findAll(filters?: { programLevelId?: string; semester?: Semester }) {
    return this.prisma.curriculumCourse.findMany({
      where: {
        ...(filters?.programLevelId && { programLevelId: filters.programLevelId }),
        ...(filters?.semester && { semester: filters.semester }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.curriculumCourse.findUnique({ where: { id } });
    if (!course) throw new NotFoundException(`Curriculum course ${id} not found`);
    return course;
  }

  async create(dto: CreateCurriculumCourseDto) {
    await this.programLevelService.findOne(dto.programLevelId);
    await this.ensureCodeIsAvailable(dto.code);
    return this.prisma.curriculumCourse.create({ data: dto });
  }

  async update(id: string, dto: UpdateCurriculumCourseDto) {
    await this.findOne(id);
    if (dto.programLevelId) await this.programLevelService.findOne(dto.programLevelId);
    await this.ensureCodeIsAvailable(dto.code, id);
    return this.prisma.curriculumCourse.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.curriculumCourse.delete({ where: { id } });
  }

  private async ensureCodeIsAvailable(code?: string, excludeId?: string) {
    if (!code) return;
    const existing = await this.prisma.curriculumCourse.findUnique({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Curriculum course code "${code}" already in use`);
    }
  }
}
