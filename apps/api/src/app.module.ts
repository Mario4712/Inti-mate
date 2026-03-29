import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ModerationModule } from "./moderation/moderation.module";
import { PaymentsModule } from "./payments/payments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { WithdrawalsModule } from "./withdrawals/withdrawals.module";
import { ContentModule } from "./content/content.module";
import { MessagesModule } from "./messages/messages.module";
import { StoriesModule } from "./stories/stories.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SupportModule } from "./support/support.module";
import { SearchModule } from "./search/search.module";
import { TipsModule } from "./tips/tips.module";
import { DigitalItemsModule } from "./digital-items/digital-items.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { LivesModule } from "./lives/lives.module";
import { AuctionsModule } from "./auctions/auctions.module";
import { ToysModule } from "./toys/toys.module";
import { AffiliatesModule } from "./affiliates/affiliates.module";
import { SchedulerPostModule } from "./scheduler/scheduler.module";
import { VerifiedTierModule } from "./verified-tier/verified-tier.module";
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

    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ModerationModule,
    PaymentsModule,
    SubscriptionsModule,
    WithdrawalsModule,
    ContentModule,
    MessagesModule,
    StoriesModule,
    NotificationsModule,
    SupportModule,
    SearchModule,
    TipsModule,
    DigitalItemsModule,
    AnalyticsModule,
    ReferralsModule,
    LivesModule,
    AuctionsModule,
    ToysModule,
    AffiliatesModule,
    SchedulerPostModule,
    VerifiedTierModule,
  ],
  providers: [
    // Rate limiting aplicado globalmente
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
