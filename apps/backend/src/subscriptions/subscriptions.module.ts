import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

import { SubscriptionContractsController } from './subscription-contracts.controller';

@Module({
  controllers: [SubscriptionsController, SubscriptionContractsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
