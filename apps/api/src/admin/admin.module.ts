import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaService } from "../common/database/prisma.service";
import { VerifiedTierService } from "../verified-tier/verified-tier.service";
import { ReviewsService } from "../reviews/reviews.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, VerifiedTierService, ReviewsService],
})
export class AdminModule {}
