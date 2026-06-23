import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassGroupService } from '../class-group/class-group.service';
import { CurriculumCourseService } from '../curriculum-course/curriculum-course.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoursInstanceDto } from './dto/create-cours-instance.dto';
import { UpdateCoursInstanceDto } from './dto/update-cours-instance.dto';

@Injectable()
export class CoursInstanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly curriculumCourseService: CurriculumCourseService,
    private readonly classGroupService: ClassGroupService,
  ) {}

  findAll(filters?: {
    curriculumCourseId?: string;
    classGroupId?: string;
    academicYear?: string;
  }) {
    return this.prisma.courseInstance.findMany({
      where: {
        ...(filters?.curriculumCourseId && {
          curriculumCourseId: filters.curriculumCourseId,
        }),
        ...(filters?.classGroupId && { classGroupId: filters.classGroupId }),
        ...(filters?.academicYear && { academicYear: filters.academicYear }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const instance = await this.prisma.courseInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException(`Course instance ${id} not found`);
    return instance;
  }

  async create(dto: CreateCoursInstanceDto) {
    await this.curriculumCourseService.findOne(dto.curriculumCourseId);
    await this.classGroupService.findOne(dto.classGroupId);
    await this.ensureUnique(
      dto.curriculumCourseId,
      dto.classGroupId,
      dto.academicYear,
    );
    return this.prisma.courseInstance.create({ data: dto });
  }

  async update(id: string, dto: UpdateCoursInstanceDto) {
    const current = await this.findOne(id);
    if (dto.curriculumCourseId)
      await this.curriculumCourseService.findOne(dto.curriculumCourseId);
    if (dto.classGroupId) await this.classGroupService.findOne(dto.classGroupId);

    const curriculumCourseId = dto.curriculumCourseId ?? current.curriculumCourseId;
    const classGroupId = dto.classGroupId ?? current.classGroupId;
    const academicYear = dto.academicYear ?? current.academicYear;
    await this.ensureUnique(curriculumCourseId, classGroupId, academicYear, id);

    return this.prisma.courseInstance.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.courseInstance.delete({ where: { id } });
  }

  private async ensureUnique(
    curriculumCourseId: string,
    classGroupId: string,
    academicYear: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.courseInstance.findFirst({
      where: { curriculumCourseId, classGroupId, academicYear },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'This course is already instantiated for this class group and academic year',
      );
    }
  }
}
