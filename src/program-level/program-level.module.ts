import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramModule } from '../program/program.module';
import { ProgramLevelController } from './program-level.controller';
import { ProgramLevelService } from './program-level.service';

@Module({
  imports: [PrismaModule, ProgramModule],
  controllers: [ProgramLevelController],
  providers: [ProgramLevelService],
  exports: [ProgramLevelService],
})
export class ProgramLevelModule {}
