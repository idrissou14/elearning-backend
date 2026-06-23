import { Module } from '@nestjs/common';
import { DepartementModule } from '../departement/departement.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';

@Module({
  imports: [PrismaModule, DepartementModule],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
