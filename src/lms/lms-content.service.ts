import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrossDbConsistencyService } from '../consistency/cross-db-consistency.service';
import { ExistenceValidatorService } from '../consistency/existence-validator.service';
import {
  CourseContent,
  CourseContentDocument,
  CourseModule,
} from '../mongodb/schemas/course-content.schema';
import {
  LearnerProgress,
  LearnerProgressDocument,
} from '../mongodb/schemas/learner-progress.schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseContentDto } from './dto/create-course-content.dto';

@Injectable()
export class LmsContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crossDb: CrossDbConsistencyService,
    private readonly existence: ExistenceValidatorService,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,
    @InjectModel(LearnerProgress.name)
    private readonly learnerProgressModel: Model<LearnerProgressDocument>,
  ) {}

  /** SAGA-01 — create (or update) the LMS content of a course instance. */
  createContent(courseInstanceId: string, dto: CreateCourseContentDto) {
    return this.crossDb.createCourseContent(courseInstanceId, {
      title: dto.title,
      description: dto.description,
      modules: dto.modules as CourseModule[] | undefined,
    });
  }

  /**
   * Combined read flow (serviceLayerGuidance.exampleReadFlow):
   * 1 Postgres query for metadata + access, then 1 Mongo query for content,
   * then 1 Mongo query for the learner's progress. No N+1.
   */
  async getContentForUser(courseInstanceId: string, userId: string) {
    const instance = await this.prisma.courseInstance.findUnique({
      where: { id: courseInstanceId },
      include: { classGroup: true, curriculumCourse: true },
    });
    if (!instance) {
      throw new NotFoundException(`Course instance ${courseInstanceId} not found`);
    }

    // Tenant isolation: the user must be enrolled in this class group → else 403.
    await this.existence.assertEnrollmentAccess(userId, instance.classGroupId);

    if (!instance.contentRef) {
      throw new NotFoundException('No content has been published for this course');
    }

    const [content, progress] = await Promise.all([
      this.courseContentModel.findById(instance.contentRef).lean(),
      this.learnerProgressModel
        .findOne({ userId, courseId: instance.contentRef })
        .lean(),
    ]);

    if (!content) {
      throw new NotFoundException('Course content document not found');
    }

    return {
      metadata: {
        courseInstanceId: instance.id,
        classGroupId: instance.classGroupId,
        academicYear: instance.academicYear,
        curriculumCourse: instance.curriculumCourse,
      },
      content,
      progress: progress ?? null,
    };
  }
}
