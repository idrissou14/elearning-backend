import { Module } from '@nestjs/common';
import { MongodbModule } from '../mongodb/mongodb.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [PrismaModule, MongodbModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
