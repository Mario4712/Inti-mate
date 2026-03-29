import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SubscriptionsService } from "./subscriptions.service";
import {
  CancelSubscriptionDto,
  CreatePlanDto,
  SubscribeDto,
} from "./dto/subscription.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@intimare/database";

@ApiTags("Assinaturas")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller({ path: "subscriptions", version: "1" })
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  // ─── Planos (apenas criadores) ───────────────────────────

  @Post("plans")
  @UseGuards(RolesGuard)
  @Roles(Role.CREATOR)
  @ApiOperation({ summary: "Criar plano de assinatura" })
  createPlan(@CurrentUser("id") creatorId: string, @Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(creatorId, dto);
  }

  @Patch("plans/:planId")
  @UseGuards(RolesGuard)
  @Roles(Role.CREATOR)
  @ApiOperation({ summary: "Atualizar plano" })
  updatePlan(
    @CurrentUser("id") creatorId: string,
    @Param("planId") planId: string,
    @Body() dto: Partial<CreatePlanDto>,
  ) {
    return this.subscriptionsService.updatePlan(creatorId, planId, dto);
  }

  @Delete("plans/:planId")
  @UseGuards(RolesGuard)
  @Roles(Role.CREATOR)
  @ApiOperation({ summary: "Desativar plano (cancela assinaturas ativas)" })
  deactivatePlan(
    @CurrentUser("id") creatorId: string,
    @Param("planId") planId: string,
  ) {
    return this.subscriptionsService.deactivatePlan(creatorId, planId);
  }

  @Get("plans/creator/:creatorId")
  @ApiOperation({ summary: "Listar planos de um criador" })
  getCreatorPlans(@Param("creatorId") creatorId: string) {
    return this.subscriptionsService.getCreatorPlans(creatorId);
  }

  // ─── Assinaturas (fãs) ───────────────────────────────────

  @Post("subscribe")
  @ApiOperation({ summary: "Assinar plano de um criador" })
  subscribe(@CurrentUser("id") subscriberId: string, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(
      subscriberId,
      dto.planId,
      dto.provider,
      dto.paymentToken,
    );
  }

  @Delete(":subscriptionId")
  @ApiOperation({ summary: "Cancelar assinatura" })
  cancel(
    @CurrentUser("id") subscriberId: string,
    @Param("subscriptionId") subscriptionId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(subscriberId, subscriptionId, dto.reason);
  }

  @Get("mine")
  @ApiOperation({ summary: "Minhas assinaturas ativas" })
  getMySubscriptions(@CurrentUser("id") subscriberId: string) {
    return this.subscriptionsService.getMySubscriptions(subscriberId);
  }

  @Get("subscribers")
  @UseGuards(RolesGuard)
  @Roles(Role.CREATOR)
  @ApiOperation({ summary: "Lista de assinantes (visão do criador)" })
  getSubscribers(
    @CurrentUser("id") creatorId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.subscriptionsService.getCreatorSubscribers(creatorId, +page, +limit);
  }
}
