import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { SupportService } from "./support.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class ChatMessageDto {
  @IsString()
  @MaxLength(1000)
  message: string;
}

@ApiTags("Support")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get("disclaimer")
  @ApiOperation({ summary: "Retorna o aviso de que o suporte é automatizado (IA identificada)" })
  disclaimer() {
    return this.supportService.getDisclaimer();
  }

  @Post("chat")
  @ApiOperation({ summary: "Envia mensagem ao chatbot de suporte" })
  @ApiBody({ type: ChatMessageDto })
  chat(@Body() body: ChatMessageDto, @Request() req: any) {
    return this.supportService.chat(req.user.id, body.message);
  }
}
