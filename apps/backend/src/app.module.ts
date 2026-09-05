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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
