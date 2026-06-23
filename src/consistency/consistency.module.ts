import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongodbModule } from '../mongodb/mongodb.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GdprEraseProcessor } from '../queue/gdpr-erase.processor';
import {
  GDPR_ERASE_QUEUE,
  RECONCILIATION_QUEUE,
} from '../queue/queue.constants';
import { ReconciliationProcessor } from '../queue/reconciliation.processor';
import { ReconciliationScheduler } from '../queue/reconciliation.scheduler';
import { CrossDbConsistencyService } from './cross-db-consistency.service';
import { ExistenceValidatorService } from './existence-validator.service';

@Module({
  imports: [
    PrismaModule,
    MongodbModule,
    BullModule.registerQueue(
      { name: RECONCILIATION_QUEUE },
      { name: GDPR_ERASE_QUEUE },
    ),
  ],
  providers: [
    ExistenceValidatorService,
    CrossDbConsistencyService,
    ReconciliationProcessor,
    GdprEraseProcessor,
    ReconciliationScheduler,
  ],
  exports: [ExistenceValidatorService, CrossDbConsistencyService],
})
export class ConsistencyModule {}
