import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FulfillmentsController } from './fulfillments.controller';
import { FulfillmentsService } from './fulfillments.service';

@Module({
  imports: [PrismaModule],
  controllers: [FulfillmentsController],
  providers: [FulfillmentsService],
  exports: [FulfillmentsService],
})
export class FulfillmentsModule {}
