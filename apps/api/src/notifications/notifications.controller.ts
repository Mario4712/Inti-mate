import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { UpdatePreferencesDto, RegisterPushDto } from "./dto/notifications.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Lista notificações do usuário" })
  list(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req: any,
  ) {
    return this.notificationsService.listNotifications(req.user.id, page, limit);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marca notificação como lida" })
  markRead(@Param("id") id: string, @Request() req: any) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Marca todas as notificações como lidas" })
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  // ─── Preferências ─────────────────────────────────────────

  @Get("preferences")
  @ApiOperation({ summary: "Preferências de notificação do usuário" })
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Atualiza preferências de notificação" })
  updatePreferences(@Body() dto: UpdatePreferencesDto, @Request() req: any) {
    return this.notificationsService.updatePreferences(req.user.id, dto);
  }

  // ─── Web Push ─────────────────────────────────────────────

  @Post("push/subscribe")
  @ApiOperation({ summary: "Registra subscription de Web Push" })
  subscribe(@Body() dto: RegisterPushDto, @Request() req: any) {
    return this.notificationsService.registerPushSubscription(req.user.id, dto);
  }

  @Delete("push/subscribe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove subscription de Web Push" })
  unsubscribe(@Body("endpoint") endpoint: string, @Request() req: any) {
    return this.notificationsService.unregisterPushSubscription(req.user.id, endpoint);
  }
}
