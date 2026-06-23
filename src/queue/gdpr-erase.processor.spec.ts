import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { ActivityLog } from '../mongodb/schemas/activity-log.schema';
import { ForumThread } from '../mongodb/schemas/forum-thread.schema';
import { LearnerProgress } from '../mongodb/schemas/learner-progress.schema';
import { PrismaService } from '../prisma/prisma.service';
import { GdprEraseProcessor } from './gdpr-erase.processor';
import { ANONYMIZED_PREFIX } from './queue.constants';

const learnerProgressModel = { updateMany: jest.fn() };
const forumThreadModel = { updateMany: jest.fn() };
const activityLogModel = { updateMany: jest.fn() };
const mockPrisma = { auditLog: { create: jest.fn() } };

describe('GdprEraseProcessor', () => {
  let processor: GdprEraseProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprEraseProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getModelToken(LearnerProgress.name), useValue: learnerProgressModel },
        { provide: getModelToken(ForumThread.name), useValue: forumThreadModel },
        { provide: getModelToken(ActivityLog.name), useValue: activityLogModel },
      ],
    }).compile();

    processor = module.get(GdprEraseProcessor);
    jest.clearAllMocks();
    learnerProgressModel.updateMany.mockResolvedValue({});
    forumThreadModel.updateMany.mockResolvedValue({});
    activityLogModel.updateMany.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it('anonymizes every Mongo collection and writes an audit log', async () => {
    const job = {
      data: { userId: 'u1', actorEmailSnapshot: 'real@x.com' },
    } as Job<{ userId: string; actorEmailSnapshot: string }>;

    const result = (await processor.process(job)) as { anonymizedAs: string };

    expect(result.anonymizedAs.startsWith(ANONYMIZED_PREFIX)).toBe(true);

    // progress + activity logs
    expect(learnerProgressModel.updateMany).toHaveBeenCalledWith(
      { userId: 'u1' },
      { $set: { userId: result.anonymizedAs } },
    );
    expect(activityLogModel.updateMany).toHaveBeenCalledWith(
      { userId: 'u1' },
      { $set: { userId: result.anonymizedAs } },
    );

    // forum: thread author + nested posts + nested replies = 3 calls
    expect(forumThreadModel.updateMany).toHaveBeenCalledTimes(3);

    // audit trail with email snapshot
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'gdpr.erase',
        actorEmail: 'real@x.com',
        resourceId: 'u1',
      }),
    });
  });

  it('is deterministic: the same user maps to the same anonymized id', async () => {
    const job = {
      data: { userId: 'u1', actorEmailSnapshot: 'real@x.com' },
    } as Job<{ userId: string; actorEmailSnapshot: string }>;

    const first = (await processor.process(job)) as { anonymizedAs: string };
    const second = (await processor.process(job)) as { anonymizedAs: string };

    expect(first.anonymizedAs).toBe(second.anonymizedAs);
  });
});
