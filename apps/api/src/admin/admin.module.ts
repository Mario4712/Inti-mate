import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaService } from "../common/database/prisma.service";
import { VerifiedTierService } from "../verified-tier/verified-tier.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, VerifiedTierService],
})
export class AdminModule {}
