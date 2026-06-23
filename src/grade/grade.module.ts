import { Module } from '@nestjs/common';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';

@Module({
  imports: [PrismaModule, EnrollmentModule, EvaluationModule, UserModule],
  controllers: [GradeController],
  providers: [GradeService],
  exports: [GradeService],
})
export class GradeModule {}
