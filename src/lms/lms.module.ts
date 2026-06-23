import { Module } from '@nestjs/common';
import { ConsistencyModule } from '../consistency/consistency.module';
import { MongodbModule } from '../mongodb/mongodb.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LmsContentController } from './lms-content.controller';
import { LmsContentService } from './lms-content.service';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [PrismaModule, MongodbModule, ConsistencyModule],
  controllers: [LmsContentController, QuizController],
  providers: [LmsContentService, QuizService],
})
export class LmsModule {}
