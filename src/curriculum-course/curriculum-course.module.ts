import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramLevelModule } from '../program-level/program-level.module';
import { CurriculumCourseController } from './curriculum-course.controller';
import { CurriculumCourseService } from './curriculum-course.service';

@Module({
  imports: [PrismaModule, ProgramLevelModule],
  controllers: [CurriculumCourseController],
  providers: [CurriculumCourseService],
  exports: [CurriculumCourseService],
})
export class CurriculumCourseModule {}
