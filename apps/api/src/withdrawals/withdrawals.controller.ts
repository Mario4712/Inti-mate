import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { WithdrawalsService } from "./withdrawals.service";
import { RequestWithdrawalDto } from "./dto/withdrawal.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@intimare/database";

@ApiTags("Saques")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
@ApiBearerAuth()
@Controller({ path: "withdrawals", version: "1" })
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Get("balance")
  @ApiOperation({ summary: "Saldo disponível e pendente" })
  getBalance(@CurrentUser("id") creatorId: string) {
    return this.withdrawalsService.getBalance(creatorId);
  }

  @Post()
  @ApiOperation({ summary: "Solicitar saque via PIX (D+14)" })
  requestWithdrawal(
    @CurrentUser("id") creatorId: string,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.withdrawalsService.requestWithdrawal(creatorId, dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Histórico de saques" })
  getHistory(
    @CurrentUser("id") creatorId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.withdrawalsService.getWithdrawalHistory(creatorId, +page, +limit);
  }
}
