import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/** Round to 2 decimals, returning a number (not a string). */
const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregated dashboard payload for a single student. Walks the student's
   * enrollments and pulls the related grades and certificates in one query,
   * then flattens them into UI-friendly shapes plus a few computed stats.
   */
  async getOverview(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        classGroup: {
          include: { programLevel: { include: { program: true } } },
        },
        // Renforcement : la promo est portée par la matière, pas par l'inscription.
        courseInstance: {
          include: {
            curriculumCourse: true,
            classGroup: {
              include: { programLevel: { include: { program: true } } },
            },
          },
        },
        grades: {
          orderBy: { gradedAt: 'desc' },
          include: {
            evaluation: {
              include: {
                courseInstance: { include: { curriculumCourse: true } },
              },
            },
          },
        },
        certificates: { orderBy: { issuedAt: 'desc' } },
      },
    });

    const enrollmentDtos = enrollments.map((e) => {
      // CURSUS → promo directe ; RENFORCEMENT → promo de la matière.
      const classGroup = e.classGroup ?? e.courseInstance?.classGroup ?? null;
      return {
        id: e.id,
        type: e.type,
        academicYear: e.academicYear,
        status: e.status,
        enrolledAt: e.enrolledAt,
        classGroupName: classGroup?.name ?? null,
        levelName: classGroup?.programLevel.levelName ?? null,
        programName: classGroup?.programLevel.program.name ?? null,
        // Renseigné uniquement pour un renforcement (matière ciblée).
        courseName: e.courseInstance?.curriculumCourse.name ?? null,
      };
    });

    const grades = enrollments.flatMap((e) =>
      e.grades.map((g) => {
        const score = Number(g.score);
        const maxScore = Number(g.evaluation.maxScore);
        return {
          id: g.id,
          score,
          maxScore,
          scoreOn20: maxScore > 0 ? round2((score / maxScore) * 20) : 0,
          gradedAt: g.gradedAt,
          comment: g.comment,
          evaluationName: g.evaluation.name,
          evaluationType: g.evaluation.type,
          courseName: g.evaluation.courseInstance.curriculumCourse.name,
          academicYear: e.academicYear,
        };
      }),
    );

    const certificates = enrollments.flatMap((e) => {
      const classGroup = e.classGroup ?? e.courseInstance?.classGroup ?? null;
      return e.certificates.map((c) => ({
        id: c.id,
        verifyToken: c.verifyToken,
        issuedAt: c.issuedAt,
        academicYear: e.academicYear,
        programName: classGroup?.programLevel.program.name ?? null,
        levelName: classGroup?.programLevel.levelName ?? null,
        courseName: e.courseInstance?.curriculumCourse.name ?? null,
      }));
    });

    const averageOn20 = grades.length
      ? round2(grades.reduce((sum, g) => sum + g.scoreOn20, 0) / grades.length)
      : null;
    const bestOn20 = grades.length
      ? round2(Math.max(...grades.map((g) => g.scoreOn20)))
      : null;

    return {
      stats: {
        enrollmentCount: enrollments.length,
        activeEnrollments: enrollments.filter(
          (e) => e.status === EnrollmentStatus.ACTIVE,
        ).length,
        gradeCount: grades.length,
        certificateCount: certificates.length,
        averageOn20,
        bestOn20,
      },
      enrollments: enrollmentDtos,
      grades,
      certificates,
    };
  }

  /**
   * Course instances the student can access: those attached to the class
   * groups of their ACTIVE enrollments. `hasContent` mirrors the access the
   * student gets from GET /cours-instance/:id/content (which itself requires
   * an ACTIVE enrollment), so the list and the reader stay consistent.
   */
  async getCourses(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      select: { classGroupId: true, courseInstanceId: true },
    });
    // CURSUS → toutes les matières de la promo ; RENFORCEMENT → la matière ciblée.
    const classGroupIds = enrollments
      .map((e) => e.classGroupId)
      .filter((id): id is string => id != null);
    const courseInstanceIds = enrollments
      .map((e) => e.courseInstanceId)
      .filter((id): id is string => id != null);
    if (classGroupIds.length === 0 && courseInstanceIds.length === 0) return [];

    const instances = await this.prisma.courseInstance.findMany({
      where: {
        OR: [
          ...(classGroupIds.length
            ? [{ classGroupId: { in: classGroupIds } }]
            : []),
          ...(courseInstanceIds.length
            ? [{ id: { in: courseInstanceIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        curriculumCourse: true,
        classGroup: {
          include: { programLevel: { include: { program: true } } },
        },
        teachers: { include: { teacher: true } },
      },
    });

    return instances.map((i) => {
      const main =
        i.teachers.find((t) => t.role === 'MAIN_TEACHER') ?? i.teachers[0];
      return {
        id: i.id,
        academicYear: i.academicYear,
        hasContent: i.contentRef != null,
        courseName: i.curriculumCourse.name,
        courseCode: i.curriculumCourse.code,
        classGroupName: i.classGroup.name,
        levelName: i.classGroup.programLevel.levelName,
        programName: i.classGroup.programLevel.program.name,
        teacherName: main
          ? `${main.teacher.firstName} ${main.teacher.lastName}`
          : null,
      };
    });
  }
}
