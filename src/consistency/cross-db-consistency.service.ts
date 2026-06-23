import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import {
  CourseContent,
  CourseContentDocument,
  CourseModule,
} from '../mongodb/schemas/course-content.schema';
import {
  LearnerProgress,
  LearnerProgressDocument,
} from '../mongodb/schemas/learner-progress.schema';
import { Question, Quiz, QuizDocument } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  GDPR_ERASE_JOB,
  GDPR_ERASE_QUEUE,
  PROGRESS_RETRY_JOB,
  RECONCILIATION_QUEUE,
} from '../queue/queue.constants';
import { ExistenceValidatorService } from './existence-validator.service';

export interface CreateCourseContentInput {
  title: string;
  description?: string;
  modules?: CourseModule[];
}

export interface CreateQuizInput {
  title: string;
  timerSeconds?: number;
  passingScore?: number;
  maxAttempts?: number;
  questions?: Question[];
}

/**
 * Orchestrates operations that span PostgreSQL and MongoDB using the Saga
 * pattern with explicit compensation (RÈGLE 4). There is no distributed
 * transaction between the two stores.
 */
@Injectable()
export class CrossDbConsistencyService {
  private readonly logger = new Logger(CrossDbConsistencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly existence: ExistenceValidatorService,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(LearnerProgress.name)
    private readonly learnerProgressModel: Model<LearnerProgressDocument>,
    @InjectQueue(RECONCILIATION_QUEUE) private readonly reconciliationQueue: Queue,
    @InjectQueue(GDPR_ERASE_QUEUE) private readonly gdprQueue: Queue,
  ) {}

  /**
   * SAGA-01 — Create LMS content for a CourseInstance.
   * Mongo first (app-generated UUID), then write the ref into Postgres;
   * compensate by deleting the Mongo document if the Postgres write fails.
   */
  async createCourseContent(courseInstanceId: string, input: CreateCourseContentInput) {
    const instance = await this.prisma.courseInstance.findUnique({
      where: { id: courseInstanceId },
    });
    if (!instance) {
      throw new NotFoundException(`Course instance ${courseInstanceId} not found`);
    }

    // Idempotency: content already linked → update it in place instead of recreating.
    if (instance.contentRef) {
      return this.courseContentModel
        .findByIdAndUpdate(instance.contentRef, { $set: input }, { new: true })
        .exec();
    }

    const _id = randomUUID();
    const created = await this.courseContentModel.create({ _id, ...input });

    try {
      await this.prisma.courseInstance.update({
        where: { id: courseInstanceId },
        data: { contentRef: _id },
      });
    } catch (err) {
      await this.compensate(() => this.courseContentModel.deleteOne({ _id }).exec());
      throw err;
    }

    return created;
  }

  /**
   * SAGA-02 — Create a quiz for an Evaluation, then link it from Postgres.
   * Compensate by deleting the Mongo quiz if the Postgres write fails.
   */
  async createEvaluationQuiz(evaluationId: string, input: CreateQuizInput) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
    });
    if (!evaluation) {
      throw new NotFoundException(`Evaluation ${evaluationId} not found`);
    }

    const courseId = evaluation.courseInstanceId;
    const instance = await this.prisma.courseInstance.findUnique({
      where: { id: courseId },
    });
    const contentRef = instance?.contentRef ?? '';

    if (evaluation.quizRef) {
      return this.quizModel
        .findByIdAndUpdate(evaluation.quizRef, { $set: input }, { new: true })
        .exec();
    }

    const _id = randomUUID();
    const created = await this.quizModel.create({ _id, courseId: contentRef, ...input });

    try {
      await this.prisma.evaluation.update({
        where: { id: evaluationId },
        data: { quizRef: _id },
      });
    } catch (err) {
      await this.compensate(() => this.quizModel.deleteOne({ _id }).exec());
      throw err;
    }

    return created;
  }

  /**
   * SAGA-03 — Initialise learner progress on enrollment.
   * Non-blocking: a Mongo failure is pushed to the reconciliation queue so the
   * enrollment itself is never rolled back (progress can be created lazily).
   */
  async initEnrollmentProgress(enrollment: {
    userId: string;
    classGroupId: string;
  }) {
    const instances = await this.prisma.courseInstance.findMany({
      where: { classGroupId: enrollment.classGroupId, contentRef: { not: null } },
      select: { contentRef: true },
    });

    for (const { contentRef } of instances) {
      if (!contentRef) continue;
      try {
        await this.learnerProgressModel.updateOne(
          { userId: enrollment.userId, courseId: contentRef },
          {
            $setOnInsert: {
              userId: enrollment.userId,
              courseId: contentRef,
              classGroupId: enrollment.classGroupId,
              modules: [],
            },
          },
          { upsert: true },
        );
      } catch (err) {
        this.logger.warn(
          `Progress init failed for ${enrollment.userId}/${contentRef}, queuing retry: ${(err as Error).message}`,
        );
        await this.reconciliationQueue.add(PROGRESS_RETRY_JOB, {
          userId: enrollment.userId,
          courseId: contentRef,
          classGroupId: enrollment.classGroupId,
        });
      }
    }
  }

  /**
   * SAGA-04 — Request GDPR erasure of a user.
   * Soft-deletes + anonymizes the Postgres user, then enqueues an idempotent
   * BullMQ job (fixed jobId) to anonymize the linked Mongo documents.
   */
  async requestGdprErase(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const actorEmailSnapshot = user.email;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
        email: `deleted-${randomUUID()}@anon`,
      },
    });

    await this.gdprQueue.add(
      GDPR_ERASE_JOB,
      { userId, actorEmailSnapshot },
      { jobId: `gdpr-${userId}`, attempts: 5, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { userId, status: 'erasure_scheduled' as const };
  }

  /** Run a compensating action; never let its own failure mask the original error. */
  private async compensate(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (err) {
      this.logger.error(`Compensation failed: ${(err as Error).message}`);
    }
  }
}
