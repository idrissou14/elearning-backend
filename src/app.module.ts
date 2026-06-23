import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { DepartementModule } from './departement/departement.module';
import { ProgramModule } from './program/program.module';
import { ProgramLevelModule } from './program-level/program-level.module';
import { CurriculumCourseModule } from './curriculum-course/curriculum-course.module';
import { ClassGroupModule } from './class-group/class-group.module';
import { CoursInstanceModule } from './cours-instance/cours-instance.module';
import { CourseTeacherController } from './course-teacher/course-teacher.controller';
import { CourseTeacherService } from './course-teacher/course-teacher.service';
import { CourseTeacherModule } from './course-teacher/course-teacher.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    AuthModule,
    DepartementModule,
    ProgramModule,
    ProgramLevelModule,
    CurriculumCourseModule,
    ClassGroupModule,
    CoursInstanceModule,
    CourseTeacherModule,
  ],
  controllers: [AppController, CourseTeacherController],
  providers: [AppService, CourseTeacherService],
})
export class AppModule {}
