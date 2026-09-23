import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CourseContent,
  CourseContentDocument,
} from '../mongodb/schemas/course-content.schema';
import { Quiz, QuizDocument } from '../mongodb/schemas/quiz.schema';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { GradeStatus } from '../grade/dto/create-grade.dto';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  /**
   * Course instances the given teacher is assigned to (via CourseTeacher),
   * flattened into UI-friendly shapes. `hasContent` tells the client whether
   * LMS content has already been published for the instance.
   */
  async getCourseInstances(teacherId: string) {
    const assignments = await this.prisma.courseTeacher.findMany({
      where: { teacherId },
      orderBy: { assignedAt: 'desc' },
      include: {
        courseInstance: {
          include: {
            curriculumCourse: true,
            classGroup: {
              include: { programLevel: { include: { program: true } } },
            },
          },
        },
      },
    });

    return assignments.map((a) => {
      const instance = a.courseInstance;
      return {
        id: instance.id,
        role: a.role,
        academicYear: instance.academicYear,
        contentRef: instance.contentRef,
        hasContent: instance.contentRef != null,
        courseName: instance.curriculumCourse.name,
        courseCode: instance.curriculumCourse.code,
        classGroupName: instance.classGroup.name,
        levelName: instance.classGroup.programLevel.levelName,
        programName: instance.classGroup.programLevel.program.name,
      };
    });
  }

  /**
   * Read-only view of the LMS content the teacher published for one of their
   * course instances. Unlike the student-facing GET /cours-instance/:id/content,
   * this does NOT require enrollment and carries no learner progression — it is
   * gated solely on the teacher being assigned to the instance (CourseTeacher).
   *
   * 403 if the teacher is not assigned to the instance.
   * 404 if no content has been published yet.
   */
  async getCourseContent(teacherId: string, courseInstanceId: string) {
    const assignment = await this.prisma.courseTeacher.findFirst({
      where: { teacherId, courseInstanceId },
      include: {
        courseInstance: {
          include: {
            curriculumCourse: true,
            classGroup: {
              include: { programLevel: { include: { program: true } } },
            },
          },
        },
      },
    });

    // Don't leak the existence of instances this teacher isn't assigned to.
    if (!assignment) {
      throw new ForbiddenException('COURSE_ACCESS_DENIED');
    }

    const instance = assignment.courseInstance;
    if (!instance.contentRef) {
      throw new NotFoundException(
        'No content has been published for this course',
      );
    }

    // Only the most recently attached quiz is surfaced. The authoritative link
    // is Evaluation.quizRef (Postgres); taking the newest one avoids stale
    // quizzes left by earlier publishes.
    const [content, latestEvaluation] = await Promise.all([
      this.courseContentModel.findById(instance.contentRef).lean(),
      this.prisma.evaluation.findFirst({
        where: { courseInstanceId: instance.id, quizRef: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { quizRef: true },
      }),
    ]);
    if (!content) {
      throw new NotFoundException('Course content document not found');
    }

    const quiz = latestEvaluation?.quizRef
      ? await this.quizModel.findById(latestEvaluation.quizRef).lean()
      : null;
    const quizzes = quiz ? [quiz] : [];

    return {
      courseInstance: {
        id: instance.id,
        role: assignment.role,
        academicYear: instance.academicYear,
        courseName: instance.curriculumCourse.name,
        courseCode: instance.curriculumCourse.code,
        classGroupName: instance.classGroup.name,
        levelName: instance.classGroup.programLevel.levelName,
        programName: instance.classGroup.programLevel.program.name,
      },
      content,
      quizzes,
    };
  }

  /**
   * Get all grades for a course instance the teacher is assigned to.
   * Returns enriched data: student info, evaluation details, score/20, status.
   * Teacher can see both DRAFT and PUBLISHED grades.
   */
  async getGradesForInstance(teacherId: string, courseInstanceId: string) {
    const assignment = await this.prisma.courseTeacher.findFirst({
      where: { teacherId, courseInstanceId },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException('COURSE_ACCESS_DENIED');
    }

    // Get course instance with relations for response
    const courseInstance = await this.prisma.courseInstance.findUnique({
      where: { id: courseInstanceId },
      include: {
        curriculumCourse: true,
        classGroup: true,
      },
    });

    if (!courseInstance) {
      throw new NotFoundException('Course instance not found');
    }

    // Get all evaluations for this course instance
    const evaluations = await this.prisma.evaluation.findMany({
      where: { courseInstanceId },
      orderBy: { createdAt: 'asc' },
    });

    const evaluationIds = evaluations.map((e) => e.id);

    // Get all enrollments for this course instance (both CURSUS via classGroup and RENFORCEMENT)
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        OR: [
          { classGroupId: courseInstance.classGroupId },
          { courseInstanceId: courseInstanceId },
        ],
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Get all grades for these enrollments and evaluations
    const grades = await this.prisma.grade.findMany({
      where: {
        enrollmentId: { in: enrollments.map((e) => e.id) },
        evaluationId: { in: evaluationIds },
      },
      include: {
        evaluation: true,
        enrollment: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });

    // Build a map for quick lookup
    const gradeMap = new Map<string, Map<string, typeof grades[0]>>();
    for (const g of grades) {
      if (!gradeMap.has(g.enrollmentId)) gradeMap.set(g.enrollmentId, new Map());
      gradeMap.get(g.enrollmentId)!.set(g.evaluationId, g);
    }

    // Build response: one row per enrollment x evaluation
    const rows = enrollments.flatMap((enrollment) =>
      evaluations.map((evaluation) => {
        const grade = gradeMap.get(enrollment.id)?.get(evaluation.id);
        const score = grade ? Number(grade.score) : null;
        const maxScore = Number(evaluation.maxScore);
        return {
          enrollmentId: enrollment.id,
          studentId: enrollment.userId,
          studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
          studentEmail: enrollment.user.email,
          evaluationId: evaluation.id,
          evaluationName: evaluation.name,
          evaluationType: evaluation.type,
          evaluationWeight: Number(evaluation.weight),
          maxScore,
          score,
          scoreOn20: score !== null && maxScore > 0 ? Math.round((score / maxScore) * 20 * 100) / 100 : null,
          status: grade?.status ?? null,
          gradedAt: grade?.gradedAt ?? null,
          publishedAt: grade?.publishedAt ?? null,
          comment: grade?.comment ?? null,
          gradedBy: grade?.gradedBy ?? null,
        };
      }),
    );

    // Stats
    const publishedGrades = rows.filter((r) => r.status === GradeStatus.PUBLISHED && r.score !== null);
    const draftGrades = rows.filter((r) => r.status === GradeStatus.DRAFT && r.score !== null);
    const allScoredGrades = rows.filter((r) => r.score !== null);

    const averageOn20 = allScoredGrades.length
      ? Math.round((allScoredGrades.reduce((sum, r) => sum + (r.scoreOn20 ?? 0), 0) / allScoredGrades.length) * 100) / 100
      : null;

    return {
      courseInstance: {
        id: courseInstance.id,
        courseName: courseInstance.curriculumCourse?.name,
        classGroupName: courseInstance.classGroup?.name,
        academicYear: courseInstance.academicYear,
      },
      evaluations,
      rows,
      stats: {
        totalStudents: enrollments.length,
        totalEvaluations: evaluations.length,
        gradedCount: allScoredGrades.length,
        publishedCount: publishedGrades.length,
        draftCount: draftGrades.length,
        averageOn20,
      },
    };
  }

  /**
   * Bulk create/update grades for a course instance.
   * Input: array of { enrollmentId, evaluationId, score, comment?, status? }
   * Validates: teacher assigned, enrollment active, score <= maxScore, no duplicates unless updating.
   */
  async bulkUpsertGrades(
    teacherId: string,
    courseInstanceId: string,
    items: Array<{
      enrollmentId: string;
      evaluationId: string;
      score: number;
      comment?: string;
      status?: GradeStatus;
    }>,
  ) {
    const assignment = await this.prisma.courseTeacher.findFirst({
      where: { teacherId, courseInstanceId },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException('COURSE_ACCESS_DENIED');
    }

    // Fetch course instance to get classGroupId for enrollment validation
    const courseInstance = await this.prisma.courseInstance.findUnique({
      where: { id: courseInstanceId },
      select: { classGroupId: true },
    });
    if (!courseInstance) {
      throw new NotFoundException('Course instance not found');
    }

    // Validate all evaluations belong to this course instance
    const evaluationIds = [...new Set(items.map((i) => i.evaluationId))];
    const evaluations = await this.prisma.evaluation.findMany({
      where: { id: { in: evaluationIds }, courseInstanceId },
      select: { id: true, maxScore: true },
    });
    const evalMap = new Map(evaluations.map((e) => [e.id, Number(e.maxScore)]));
    for (const item of items) {
      const maxScore = evalMap.get(item.evaluationId);
      if (maxScore === undefined) {
        throw new NotFoundException(`Evaluation ${item.evaluationId} not found in this course`);
      }
      if (item.score > maxScore) {
        throw new BadRequestException(`Score ${item.score} exceeds max ${maxScore} for evaluation ${item.evaluationId}`);
      }
    }

    // Validate enrollments are active and belong to this course instance
    const enrollmentIds = [...new Set(items.map((i) => i.enrollmentId))];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        id: { in: enrollmentIds },
        OR: [
          { classGroupId: courseInstance.classGroupId },
          { courseInstanceId: courseInstanceId },
        ],
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    const validEnrollmentIds = new Set(enrollments.map((e) => e.id));
    for (const item of items) {
      if (!validEnrollmentIds.has(item.enrollmentId)) {
        throw new ForbiddenException(`Enrollment ${item.enrollmentId} not accessible for this course`);
      }
    }

    // Upsert each grade
    const results = await Promise.all(
      items.map(async (item) => {
        const existing = await this.prisma.grade.findFirst({
          where: { enrollmentId: item.enrollmentId, evaluationId: item.evaluationId },
        });

        const wasDraft = existing?.status === GradeStatus.DRAFT;
        const willBePublished = item.status === GradeStatus.PUBLISHED;

        const data: any = {
          score: item.score,
          comment: item.comment,
          status: item.status ?? GradeStatus.DRAFT,
          gradedBy: teacherId,
        };
        if (data.status === GradeStatus.PUBLISHED) {
          data.publishedAt = new Date();
        }

        if (existing) {
          // If publishing an existing draft, set publishedAt
          if (existing.status === GradeStatus.DRAFT && data.status === GradeStatus.PUBLISHED) {
            data.publishedAt = new Date();
          }
          // If unpublishing, clear publishedAt
          if (existing.status === GradeStatus.PUBLISHED && data.status === GradeStatus.DRAFT) {
            data.publishedAt = null;
          }
          const updated = await this.prisma.grade.update({
            where: { id: existing.id },
            data,
            include: {
              enrollment: { include: { user: true } },
              evaluation: { include: { courseInstance: { include: { curriculumCourse: true } } } },
            },
          });

          // Send notification if newly published
          if (wasDraft && willBePublished && updated.enrollment?.user) {
            await this.notificationService.notifyGradePublished(
              updated.enrollment.user.id,
              updated.evaluation.courseInstance.curriculumCourse.name,
              updated.evaluation.name,
              Number(updated.score),
              Number(updated.evaluation.maxScore),
              updated.id,
            );
          }

          return updated;
        } else {
          const created = await this.prisma.grade.create({
            data: {
              enrollmentId: item.enrollmentId,
              evaluationId: item.evaluationId,
              ...data,
            },
            include: {
              enrollment: { include: { user: true } },
              evaluation: { include: { courseInstance: { include: { curriculumCourse: true } } } },
            },
          });

          // Send notification if created as published
          if (willBePublished && created.enrollment?.user) {
            await this.notificationService.notifyGradePublished(
              created.enrollment.user.id,
              created.evaluation.courseInstance.curriculumCourse.name,
              created.evaluation.name,
              Number(created.score),
              Number(created.evaluation.maxScore),
              created.id,
            );
          }

          return created;
        }
      }),
    );

    return results;
  }
}
