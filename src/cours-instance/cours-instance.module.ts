import { Module } from '@nestjs/common';
import { ClassGroupModule } from '../class-group/class-group.module';
import { CurriculumCourseModule } from '../curriculum-course/curriculum-course.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CoursInstanceController } from './cours-instance.controller';
import { CoursInstanceService } from './cours-instance.service';

@Module({
  imports: [PrismaModule, CurriculumCourseModule, ClassGroupModule],
  controllers: [CoursInstanceController],
  providers: [CoursInstanceService],
  exports: [CoursInstanceService],
})
export class CoursInstanceModule {}
