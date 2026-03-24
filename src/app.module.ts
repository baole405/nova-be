import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApartmentsModule } from './apartments/apartments.module';
import { AuthModule } from './auth/auth.module';
import { BillsModule } from './bills/bills.module';
import { BookingsModule } from './bookings/bookings.module';
import { FeeTypesModule } from './fee-types/fee-types.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { RootModule } from './root/root.module';
import { StatsModule } from './stats/stats.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    BillsModule,
    TransactionsModule,
    ApartmentsModule,
    NotificationsModule,
    PaymentsModule,
    StatsModule,
    BookingsModule,
    FeeTypesModule,
    RootModule,
  ],
})
export class AppModule {}
