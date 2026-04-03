import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { AiPersonaModule } from "./ai-persona/ai-persona.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { CollabModule } from "./collab/collab.module";
import { TournamentsModule } from "./tournaments/tournaments.module";
import { CryptoPaymentsModule } from "./crypto-payments/crypto-payments.module";
import { LocationModule } from "./location/location.module";
import { AiAvatarModule } from "./ai-avatar/ai-avatar.module";
import { ContentGenModule } from "./content-gen/content-gen.module";
import { EditSuggestionsModule } from "./edit-suggestions/edit-suggestions.module";
import { VrContentModule } from "./vr-content/vr-content.module";
import { DatabaseModule } from "./common/database/database.module";
import { RedisModule } from "./common/redis/redis.module";
import { SentryModule } from "./common/sentry/sentry.module";
import { HealthModule } from "./common/health/health.module";
import { AuditModule } from "./common/audit/audit.module";
import { DlqModule } from "./common/dlq/dlq.module";
import { UserThrottleGuard } from "./common/guards/user-throttle.guard";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
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
    SentryModule,
    HealthModule,
    AuditModule,
    DlqModule,
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
    AiPersonaModule,
    RecommendationsModule,
    CollabModule,
    TournamentsModule,
    CryptoPaymentsModule,
    LocationModule,
    AiAvatarModule,
    ContentGenModule,
    EditSuggestionsModule,
    VrContentModule,
  ],
  providers: [
    // Rate limiting per user ID (falls back to IP for anonymous)
    { provide: APP_GUARD, useClass: UserThrottleGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes("*");
  }
}
