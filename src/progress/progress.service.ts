import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpentMs?: number;
}

export interface CourseProgress {
  courseInstanceId: string;
  lessons: LessonProgress[];
  lastAccessedAt: string;
  completedAt?: string;
}

type ProgressJsonValue = {
  courseInstanceId: string;
  lessons: Array<{
    lessonId: string;
    completed: boolean;
    completedAt?: string;
    timeSpentMs?: number;
  }>;
  lastAccessedAt: string;
  completedAt?: string;
};

function emptyProgress(courseInstanceId: string): CourseProgress {
  return {
    courseInstanceId,
    lessons: [],
    lastAccessedAt: new Date().toISOString(),
  };
}

function isValidProgress(data: Prisma.JsonValue): data is ProgressJsonValue {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.courseInstanceId === 'string' &&
    Array.isArray(d.lessons) &&
    typeof d.lastAccessedAt === 'string'
  );
}

function toCourseProgress(data: ProgressJsonValue): CourseProgress {
  return {
    courseInstanceId: data.courseInstanceId,
    lessons: data.lessons.map((l) => ({
      lessonId: l.lessonId,
      completed: l.completed,
      completedAt: l.completedAt,
      timeSpentMs: l.timeSpentMs,
    })),
    lastAccessedAt: data.lastAccessedAt,
    completedAt: data.completedAt,
  };
}

function toInputJsonValue(progress: CourseProgress): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(progress)) as Prisma.InputJsonValue;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: string, courseInstanceId: string): Promise<CourseProgress | null> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        OR: [
          { classGroup: { courseInstances: { some: { id: courseInstanceId } } } },
          { courseInstanceId },
        ],
      },
      select: { progress: true },
    });

    if (!enrollment) return null;

    const progress = enrollment.progress;
    if (isValidProgress(progress)) {
      return toCourseProgress(progress);
    }

    return emptyProgress(courseInstanceId);
  }

  async updateProgress(
    userId: string,
    courseInstanceId: string,
    lessonId: string,
    completed: boolean,
    timeSpentMs?: number
  ): Promise<CourseProgress> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        OR: [
          { classGroup: { courseInstances: { some: { id: courseInstanceId } } } },
          { courseInstanceId },
        ],
      },
      select: { id: true, progress: true },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const currentProgress = enrollment.progress;
    const progress: CourseProgress = isValidProgress(currentProgress)
      ? toCourseProgress(currentProgress)
      : emptyProgress(courseInstanceId);

    const lessonIndex = progress.lessons.findIndex((l) => l.lessonId === lessonId);
    const lessonProgress: LessonProgress = {
      lessonId,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      timeSpentMs,
    };

    const updatedLessons = lessonIndex >= 0
      ? [...progress.lessons.slice(0, lessonIndex), lessonProgress, ...progress.lessons.slice(lessonIndex + 1)]
      : [...progress.lessons, lessonProgress];

    const allCompleted = updatedLessons.length > 0 && updatedLessons.every((l) => l.completed);
    const updatedProgress: CourseProgress = {
      ...progress,
      lessons: updatedLessons,
      lastAccessedAt: new Date().toISOString(),
      completedAt: allCompleted && !progress.completedAt ? new Date().toISOString() : progress.completedAt,
    };

    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progress: toInputJsonValue(updatedProgress) },
    });

    return updatedProgress;
  }

  async markLessonComplete(userId: string, courseInstanceId: string, lessonId: string): Promise<CourseProgress> {
    return this.updateProgress(userId, courseInstanceId, lessonId, true);
  }

  async markLessonIncomplete(userId: string, courseInstanceId: string, lessonId: string): Promise<CourseProgress> {
    return this.updateProgress(userId, courseInstanceId, lessonId, false);
  }

  async getAllProgress(userId: string): Promise<CourseProgress[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { progress: true },
    });

    const results: CourseProgress[] = [];
    for (const e of enrollments) {
      const progress = e.progress;
      if (isValidProgress(progress)) {
        results.push(toCourseProgress(progress));
      }
    }
    return results;
  }
}