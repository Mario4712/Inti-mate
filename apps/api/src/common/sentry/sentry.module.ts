import { Module, Global, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  private readonly logger = new Logger(SentryModule.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const dsn = this.config.get("app.sentry.dsn");
    if (!dsn) {
      this.logger.debug("Sentry DSN nao configurado — monitoramento desativado");
      return;
    }

    try {
      const Sentry = require("@sentry/node");
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      });
      this.logger.log("Sentry inicializado com sucesso");
    } catch {
      this.logger.warn("Sentry nao disponivel (instale @sentry/node para ativar)");
    }
  }
}
