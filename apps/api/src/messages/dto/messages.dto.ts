import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  recipientId: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ description: "ID de mídia paga a ser enviada com a mensagem" })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({ description: "Valor cobrado para visualizar (mensagem paga)", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}

export class GetMessagesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  before?: string; // cursor (messageId)
}
