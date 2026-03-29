import { IsBoolean, IsOptional, IsString, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newContent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newMessage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newSubscriber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paymentReceived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}

export class RegisterPushDto {
  @ApiPropertyOptional()
  @IsString()
  endpoint: string;

  @ApiPropertyOptional()
  @IsObject()
  keys: { p256dh: string; auth: string };
}
