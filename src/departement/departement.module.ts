import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DepartementController } from './departement.controller';
import { DepartementService } from './departement.service';

@Module({
  imports: [PrismaModule],
  controllers: [DepartementController],
  providers: [DepartementService],
  exports: [DepartementService],
})
export class DepartementModule {}
