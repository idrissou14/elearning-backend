import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import {
  CourseContent,
  CourseContentDocument,
} from '../mongodb/schemas/course-content.schema';
import {
  ForumThread,
  ForumThreadDocument,
} from '../mongodb/schemas/forum-thread.schema';
import {
  LearnerProgress,
  LearnerProgressDocument,
} from '../mongodb/schemas/learner-progress.schema';
import { Quiz, QuizDocument } from '../mongodb/schemas/quiz.schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  ANONYMIZED_PREFIX,
  PROGRESS_RETRY_JOB,
  ProgressRetryPayload,
  RECONCILIATION_JOB,
  RECONCILIATION_QUEUE,
} from './queue.constants';

export interface ReconciliationReport {
  orphanCourseContent: string[];
  danglingContentRefs: string[];
  orphanProgressUsers: string[];
  danglingForumGroups: string[];
  danglingQuizRefs: string[];
}

@Processor(RECONCILIATION_QUEUE)
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(LearnerProgress.name)
    private readonly learnerProgressModel: Model<LearnerProgressDocument>,
    @InjectModel(ForumThread.name)
    private readonly forumThreadModel: Model<ForumThreadDocument>,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case RECONCILIATION_JOB:
        return this.runChecks();
      case PROGRESS_RETRY_JOB:
        return this.retryProgress(job.data as ProgressRetryPayload);
      default:
        this.logger.warn(`Unknown reconciliation job: ${job.name}`);
        return undefined;
    }
  }

  /** Re-attempt the SAGA-03 upsert that failed at enrollment time. */
  private async retryProgress(data: ProgressRetryPayload) {
    await this.learnerProgressModel.updateOne(
      { userId: data.userId, courseId: data.courseId },
      {
        $setOnInsert: {
          userId: data.userId,
          courseId: data.courseId,
          classGroupId: data.classGroupId,
          modules: [],
        },
      },
      { upsert: true },
    );
    return { retried: true };
  }

  /** The 5 cross-database consistency checks. Alerts only — never auto-deletes. */
  private async runChecks(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      orphanCourseContent: [],
      danglingContentRefs: [],
      orphanProgressUsers: [],
      danglingForumGroups: [],
      danglingQuizRefs: [],
    };

    // Postgres ↔ course_content (checks 1 & 2)
    const instances = await this.prisma.courseInstance.findMany({
      where: { contentRef: { not: null } },
      select: { id: true, contentRef: true },
    });
    const contentRefs = new Set(
      instances.map((i) => i.contentRef).filter((v): v is string => Boolean(v)),
    );
    const contents = await this.courseContentModel.find({}, { _id: 1 }).lean();
    const contentIds = new Set(contents.map((c) => c._id as string));

    for (const id of contentIds) {
      if (!contentRefs.has(id)) report.orphanCourseContent.push(id);
    }
    for (const instance of instances) {
      if (instance.contentRef && !contentIds.has(instance.contentRef)) {
        report.danglingContentRefs.push(instance.id);
      }
    }

    // learner_progress.userId → users (check 3, excluding anonymized)
    const progressUserIds: string[] =
      await this.learnerProgressModel.distinct('userId');
    const realCandidates = progressUserIds.filter(
      (id) => !id.startsWith(ANONYMIZED_PREFIX),
    );
    if (realCandidates.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: realCandidates } },
        select: { id: true },
      });
      const userSet = new Set(users.map((u) => u.id));
      for (const id of realCandidates) {
        if (!userSet.has(id)) report.orphanProgressUsers.push(id);
      }
    }

    // forum_threads.classGroupId → class_groups (check 4)
    const groupIds: string[] = await this.forumThreadModel.distinct('classGroupId');
    if (groupIds.length) {
      const groups = await this.prisma.classGroup.findMany({
        where: { id: { in: groupIds } },
        select: { id: true },
      });
      const groupSet = new Set(groups.map((g) => g.id));
      for (const id of groupIds) {
        if (!groupSet.has(id)) report.danglingForumGroups.push(id);
      }
    }

    // Evaluation.quizRef → quizzes (check 5)
    const evaluations = await this.prisma.evaluation.findMany({
      where: { quizRef: { not: null } },
      select: { id: true, quizRef: true },
    });
    const quizRefs = evaluations
      .map((e) => e.quizRef)
      .filter((v): v is string => Boolean(v));
    if (quizRefs.length) {
      const quizzes = await this.quizModel
        .find({ _id: { $in: quizRefs } }, { _id: 1 })
        .lean();
      const quizSet = new Set(quizzes.map((q) => q._id as string));
      for (const evaluation of evaluations) {
        if (evaluation.quizRef && !quizSet.has(evaluation.quizRef)) {
          report.danglingQuizRefs.push(evaluation.id);
        }
      }
    }

    this.logReport(report);
    return report;
  }

  private logReport(report: ReconciliationReport) {
    const total = Object.values(report).reduce((sum, arr) => sum + arr.length, 0);
    if (total === 0) {
      this.logger.log('Reconciliation: no inconsistencies found');
      return;
    }
    this.logger.warn(`Reconciliation found ${total} inconsistencies: ${JSON.stringify(report)}`);
  }
}
