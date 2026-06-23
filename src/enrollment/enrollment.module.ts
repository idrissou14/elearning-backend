import { Module } from '@nestjs/common';
import { ClassGroupModule } from '../class-group/class-group.module';
import { ConsistencyModule } from '../consistency/consistency.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

@Module({
  imports: [PrismaModule, UserModule, ClassGroupModule, ConsistencyModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
