import { Module } from '@nestjs/common';
import { CoursInstanceModule } from '../cours-instance/cours-instance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [PrismaModule, CoursInstanceModule],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
