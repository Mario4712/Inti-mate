import {
  Controller, Get, Post, Delete, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, MaxLength, Length } from "class-validator";
import { LocationService } from "./location.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class SetLocationDto {
  @IsString() @MaxLength(100)
  city: string;

  @IsString() @Length(2, 2)
  state: string; // sigla ex: SP
}

@ApiTags("Location")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("location")
export class LocationController {
  constructor(private readonly service: LocationService) {}

  @Post()
  @ApiOperation({
    summary: "Ativa localização (opt-in explícito)",
    description:
      "Armazena APENAS cidade e estado (nunca coordenadas). " +
      "Expiração automática em 30 dias. Registra consentimento LGPD.",
  })
  setLocation(@Body() dto: SetLocationDto, @Request() req: any) {
    return this.service.setLocation(req.user.id, dto.city, dto.state);
  }

  @Get("me")
  @ApiOperation({ summary: "Retorna a localização ativa do usuário autenticado" })
  getMyLocation(@Request() req: any) {
    return this.service.getMyLocation(req.user.id);
  }

  @Delete()
  @ApiOperation({ summary: "Remove localização (opt-out imediato)" })
  removeLocation(@Request() req: any) {
    return this.service.removeLocation(req.user.id);
  }

  @Get("creators-nearby")
  @ApiOperation({
    summary: "Criadores no mesmo estado (requer localização ativa)",
    description: "Filtra por estado (não cidade exacta) para preservar privacidade.",
  })
  getCreatorsNearby(
    @Request() req: any,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getCreatorsNearby(req.user.id, limit);
  }
}
