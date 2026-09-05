import { Module } from '@nestjs/common';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { UpsellRulesModule } from '../upsell-rules/upsell-rules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DealHealthStubService } from './deal-health.stub.service';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [PrismaModule, DiscountRulesModule, UpsellRulesModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, DealHealthStubService],
  exports: [QuotationsService, DealHealthStubService],
})
export class QuotationsModule {}
