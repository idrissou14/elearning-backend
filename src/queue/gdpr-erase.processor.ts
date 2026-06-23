import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
} from '../mongodb/schemas/activity-log.schema';
import {
  ForumThread,
  ForumThreadDocument,
} from '../mongodb/schemas/forum-thread.schema';
import {
  LearnerProgress,
  LearnerProgressDocument,
} from '../mongodb/schemas/learner-progress.schema';
import { PrismaService } from '../prisma/prisma.service';
import {
  ANONYMIZED_PREFIX,
  GDPR_ERASE_QUEUE,
  GdprErasePayload,
} from './queue.constants';

/**
 * SAGA-04 step 2 — idempotent & replayable anonymization of all Mongo documents
 * that reference an erased user. Replacing the id with a stable anonymized token
 * means a second run matches nothing and is a no-op.
 */
@Processor(GDPR_ERASE_QUEUE)
export class GdprEraseProcessor extends WorkerHost {
  private readonly logger = new Logger(GdprEraseProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(LearnerProgress.name)
    private readonly learnerProgressModel: Model<LearnerProgressDocument>,
    @InjectModel(ForumThread.name)
    private readonly forumThreadModel: Model<ForumThreadDocument>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {
    super();
  }

  async process(job: Job<GdprErasePayload>): Promise<unknown> {
    const { userId, actorEmailSnapshot } = job.data;
    const anon = this.anonymizedId(userId);

    // learner_progress (REF-03)
    await this.learnerProgressModel.updateMany(
      { userId },
      { $set: { userId: anon } },
    );

    // forum_threads: thread author, post authors, reply authors (REF-06)
    await this.forumThreadModel.updateMany(
      { authorId: userId },
      { $set: { authorId: anon } },
    );
    await this.forumThreadModel.updateMany(
      { 'posts.authorId': userId },
      { $set: { 'posts.$[p].authorId': anon } },
      { arrayFilters: [{ 'p.authorId': userId }] },
    );
    await this.forumThreadModel.updateMany(
      { 'posts.replies.authorId': userId },
      { $set: { 'posts.$[].replies.$[r].authorId': anon } },
      { arrayFilters: [{ 'r.authorId': userId }] },
    );

    // activity_logs (REF-08)
    await this.activityLogModel.updateMany({ userId }, { $set: { userId: anon } });

    // SAGA-04 step 3 — audit trail with the email snapshot.
    await this.prisma.auditLog.create({
      data: {
        actorId: null,
        actorEmail: actorEmailSnapshot,
        action: 'gdpr.erase',
        resourceType: 'user',
        resourceId: userId,
        payload: { anonymizedAs: anon },
      },
    });

    this.logger.log(`GDPR erasure completed for ${userId} → ${anon}`);
    return { userId, anonymizedAs: anon };
  }

  private anonymizedId(userId: string): string {
    const hash = createHash('sha256').update(userId).digest('hex').slice(0, 16);
    return `${ANONYMIZED_PREFIX}${hash}`;
  }
}
