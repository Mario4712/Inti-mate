import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ModerationModule } from "./moderation/moderation.module";
import { PaymentsModule } from "./payments/payments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { WithdrawalsModule } from "./withdrawals/withdrawals.module";
import { DatabaseModule } from "./common/database/database.module";
import { RedisModule } from "./common/redis/redis.module";
import appConfig from "./config/app.config";

@Module({
  imports: [
    // Configurações globais
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: [".env.local", ".env"],
    }),

    // Rate limiting global: 100 req / 60s por IP
    ThrottlerModule.forRoot([
      {
        name: "global",
        ttl: 60_000,
        limit: 100,
      },
      // Limite mais restrito para auth: 10 req / 60s
      {
        name: "auth",
        ttl: 60_000,
        limit: 10,
      },
    ]),

    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ModerationModule,
    PaymentsModule,
    SubscriptionsModule,
    WithdrawalsModule,
  ],
  providers: [
    // Rate limiting aplicado globalmente
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
