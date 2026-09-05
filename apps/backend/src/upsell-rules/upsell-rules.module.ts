import { Module } from '@nestjs/common';
import { UpsellRulesController } from './upsell-rules.controller';
import { UpsellRulesService } from './upsell-rules.service';

@Module({
  controllers: [UpsellRulesController],
  providers: [UpsellRulesService],
  exports: [UpsellRulesService],
})
export class UpsellRulesModule {}
