import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../../generated/prisma/enums';
import {
  CourseContent,
  CourseContentDocument,
} from '../mongodb/schemas/course-content.schema';
import { Quiz, QuizDocument } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RÈGLE 3: cross-database consistency is enforced at the application layer.
 * These helpers assert that a referenced entity exists in the *other* database
 * before a dependent document is written.
 */
@Injectable()
export class ExistenceValidatorService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  /** REF-03/06/08 — the user must exist in Postgres (optionally be a STUDENT). */
  async assertUserExists(userId: string, requireStudent = false) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (requireStudent && user.role !== Role.STUDENT) {
      throw new BadRequestException(`User ${userId} is not a student`);
    }
    return user;
  }

  /** REF-05/07 — the class group must exist in Postgres. */
  async assertClassGroupExists(classGroupId: string) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true },
    });
    if (!group)
      throw new NotFoundException(`Class group ${classGroupId} not found`);
    return group;
  }

  /** REF-04/09 — the course content must exist in Mongo. */
  async assertCourseContentExists(contentId: string) {
    const exists = await this.courseContentModel.exists({ _id: contentId });
    if (!exists) {
      throw new NotFoundException(`Course content ${contentId} not found`);
    }
  }

  /** REF-09 — the quiz must exist in Mongo before being attached to a lesson. */
  async assertQuizExists(quizId: string) {
    const exists = await this.quizModel.exists({ _id: quizId });
    if (!exists) throw new NotFoundException(`Quiz ${quizId} not found`);
  }

  /**
   * Tenant isolation (REF-07): the user must hold an active enrollment covering
   * this course instance before reading content / forum / progress. Access is
   * granted by either a CURSUS enrollment in the owning class group, or a
   * RENFORCEMENT enrollment targeting this very course instance. Throws 403
   * otherwise.
   */
  async assertEnrollmentAccess(
    userId: string,
    courseInstance: { id: string; classGroupId: string },
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [
          { classGroupId: courseInstance.classGroupId },
          { courseInstanceId: courseInstance.id },
        ],
      },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('COURSE_ACCESS_DENIED');
    }
  }
}
