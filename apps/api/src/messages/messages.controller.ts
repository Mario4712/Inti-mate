import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { SendMessageDto } from "./dto/messages.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Messages")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: "messages", version: "1" })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get("conversations")
  @ApiOperation({ summary: "Lista todas as conversas do usuário" })
  listConversations(@Request() req: any) {
    return this.messagesService.listConversations(req.user.id);
  }

  @Get("conversations/:conversationId")
  @ApiOperation({ summary: "Carrega mensagens de uma conversa (cursor-based, 30/página)" })
  getMessages(
    @Param("conversationId") conversationId: string,
    @Query("before") before: string | undefined,
    @Request() req: any,
  ) {
    return this.messagesService.getMessages(req.user.id, conversationId, before);
  }

  @Post()
  @ApiOperation({ summary: "Envia uma mensagem (suporta mensagem paga)" })
  sendMessage(@Body() dto: SendMessageDto, @Request() req: any) {
    return this.messagesService.sendMessage(req.user.id, dto);
  }
}
