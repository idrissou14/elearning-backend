import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

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
}
