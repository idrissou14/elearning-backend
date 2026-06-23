import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RECONCILIATION_JOB, RECONCILIATION_QUEUE } from './queue.constants';

const EVERY_5_MINUTES = 5 * 60 * 1000;

/** Registers the repeatable cross-database reconciliation job (every 5 minutes). */
@Injectable()
export class ReconciliationScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationScheduler.name);

  constructor(
    @InjectQueue(RECONCILIATION_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.add(
      RECONCILIATION_JOB,
      {},
      {
        repeat: { every: EVERY_5_MINUTES },
        jobId: 'reconciliation-cron',
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    this.logger.log('Reconciliation cron scheduled (every 5 minutes)');
  }
}
