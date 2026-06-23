import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramLevelModule } from '../program-level/program-level.module';
import { ClassGroupController } from './class-group.controller';
import { ClassGroupService } from './class-group.service';

@Module({
  imports: [PrismaModule, ProgramLevelModule],
  controllers: [ClassGroupController],
  providers: [ClassGroupService],
  exports: [ClassGroupService],
})
export class ClassGroupModule {}
