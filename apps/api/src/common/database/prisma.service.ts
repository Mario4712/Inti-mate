import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@intimare/database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? [{ emit: "event", level: "query" }, "error", "warn"]
          : ["error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Conectado ao banco de dados");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Desconectado do banco de dados");
  }

  // Soft delete — respeita direito LGPD de exclusão
  async softDelete(model: string, id: string) {
    return (this as any)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
