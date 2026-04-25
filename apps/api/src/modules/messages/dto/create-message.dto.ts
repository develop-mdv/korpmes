import {
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum CreateMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  VOICE = 'VOICE',
  SYSTEM = 'SYSTEM',
}

export class CreateMessageDto {
  // Content is optional when fileIds is non-empty (attachment-only message).
  @ApiPropertyOptional({ description: 'Message content', maxLength: 4096 })
  @ValidateIf((o) => !o.fileIds || o.fileIds.length === 0)
  @IsString()
  @MaxLength(4096)
  content?: string;

  @ApiPropertyOptional({ enum: CreateMessageType, default: CreateMessageType.TEXT })
  @IsOptional()
  @IsEnum(CreateMessageType)
  type?: CreateMessageType;

  @ApiPropertyOptional({ description: 'Parent message ID for thread replies' })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiPropertyOptional({ description: 'File attachment IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}
