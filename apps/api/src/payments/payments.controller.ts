import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("transactions")
  @ApiOperation({ summary: "Histórico de transações do usuário" })
  getTransactions(@Req() req: any, @Query("page") page = "1") {
    return this.paymentsService.getTransactionHistory(req.user.id, Number(page));
  }
}
