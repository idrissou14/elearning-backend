import { Module } from '@nestjs/common';
import { CoursInstanceModule } from '../cours-instance/cours-instance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { CourseTeacherController } from './course-teacher.controller';
import { CourseTeacherService } from './course-teacher.service';

@Module({
  imports: [PrismaModule, CoursInstanceModule, UserModule],
  controllers: [CourseTeacherController],
  providers: [CourseTeacherService],
  exports: [CourseTeacherService],
})
export class CourseTeacherModule {}
