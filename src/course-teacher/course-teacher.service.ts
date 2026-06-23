import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import { CoursInstanceService } from '../cours-instance/cours-instance.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { CreateCourseTeacherDto } from './dto/create-course-teacher.dto';
import { UpdateCourseTeacherDto } from './dto/update-course-teacher.dto';

@Injectable()
export class CourseTeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursInstanceService: CoursInstanceService,
    private readonly userService: UserService,
  ) {}

  findAll(filters?: { courseInstanceId?: string; teacherId?: string }) {
    return this.prisma.courseTeacher.findMany({
      where: {
        ...(filters?.courseInstanceId && {
          courseInstanceId: filters.courseInstanceId,
        }),
        ...(filters?.teacherId && { teacherId: filters.teacherId }),
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.courseTeacher.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException(`Course teacher ${id} not found`);
    return assignment;
  }

  async create(dto: CreateCourseTeacherDto) {
    await this.coursInstanceService.findOne(dto.courseInstanceId);
    await this.ensureUserIsTeacher(dto.teacherId);
    await this.ensureNotAlreadyAssigned(dto.courseInstanceId, dto.teacherId);
    return this.prisma.courseTeacher.create({ data: dto });
  }

  async update(id: string, dto: UpdateCourseTeacherDto) {
    await this.findOne(id);
    return this.prisma.courseTeacher.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.courseTeacher.delete({ where: { id } });
  }

  private async ensureUserIsTeacher(teacherId: string) {
    const user = await this.userService.findOne(teacherId);
    if (user.role !== Role.TEACHER) {
      throw new BadRequestException(`User ${teacherId} is not a teacher`);
    }
  }

  private async ensureNotAlreadyAssigned(courseInstanceId: string, teacherId: string) {
    const existing = await this.prisma.courseTeacher.findFirst({
      where: { courseInstanceId, teacherId },
    });
    if (existing) {
      throw new ConflictException(
        'This teacher is already assigned to this course instance',
      );
    }
  }
}
