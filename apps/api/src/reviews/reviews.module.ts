import { Module } from "@nestjs/common";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { PrismaService } from "../common/database/prisma.service";

@Module({
  controllers: [ReviewsController],
  providers:   [ReviewsService, PrismaService],
  exports:     [ReviewsService],
})
export class ReviewsModule {}
