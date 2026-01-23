import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApartmentsModule } from "./apartments/apartments.module";
import { AuthModule } from "./auth/auth.module";
import { BillsModule } from "./bills/bills.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { TransactionsModule } from "./transactions/transactions.module";

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
  ],
})
export class AppModule {}
