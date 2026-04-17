import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  recipientId: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ description: "URL da mídia a ser enviada com a mensagem" })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: "Valor cobrado para visualizar (mensagem paga) em centavos", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePaid?: number;
}

export class GetMessagesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  before?: string; // cursor (messageId)
}
