import { Module } from '@nestjs/common';
import { DepartementController } from './departement.controller';

@Module({
  controllers: [DepartementController]
})
export class DepartementModule {}
