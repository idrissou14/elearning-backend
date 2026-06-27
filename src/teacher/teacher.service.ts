import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CourseContent,
  CourseContentDocument,
} from '../mongodb/schemas/course-content.schema';
import { Quiz, QuizDocument } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
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
      throw new NotFoundException('No content has been published for this course');
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
}
