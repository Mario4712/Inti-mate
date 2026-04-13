import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

class CreateReportDto {
  @ApiPropertyOptional({ description: "ID do usuário denunciado (mutuamente exclusivo com contentId)" })
  @IsOptional()
  @IsString()
  reportedUserId?: string;

  @ApiPropertyOptional({ description: "ID do conteúdo denunciado (mutuamente exclusivo com reportedUserId)" })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiProperty({ description: "Motivo da denúncia" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: "reports", version: "1" })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Denunciar um usuário ou conteúdo" })
  create(
    @Body() dto: CreateReportDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.reportsService.createReport(userId, dto);
  }
}
