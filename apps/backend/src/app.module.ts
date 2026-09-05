import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { DiscountRulesModule } from './discount-rules/discount-rules.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UpsellRulesModule } from './upsell-rules/upsell-rules.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { PortalModule } from './portal/portal.module';
import { FulfillmentsModule } from './fulfillments/fulfillments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CustomersModule,
    WarehousesModule,
    DiscountRulesModule,
    SubscriptionsModule,
    UpsellRulesModule,
    QuotationsModule,
    ApprovalsModule,
    PortalModule,
    FulfillmentsModule,
    InvoicesModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
