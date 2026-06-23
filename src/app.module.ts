import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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
import { CourseTeacherModule } from './course-teacher/course-teacher.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { GradeModule } from './grade/grade.module';
import { CertificateModule } from './certificate/certificate.module';
import { AuditModule } from './audit/audit.module';
import { ConsistencyModule } from './consistency/consistency.module';
import { LmsModule } from './lms/lms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URL'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
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
    EvaluationModule,
    EnrollmentModule,
    GradeModule,
    CertificateModule,
    AuditModule,
    ConsistencyModule,
    LmsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
