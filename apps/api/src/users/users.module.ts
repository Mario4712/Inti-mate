import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { KycService } from "./kyc.service";
import { ContentModule } from "../content/content.module";

@Module({
  imports: [ContentModule],
  controllers: [UsersController],
  providers: [UsersService, KycService],
  exports: [UsersService],
})
export class UsersModule {}
