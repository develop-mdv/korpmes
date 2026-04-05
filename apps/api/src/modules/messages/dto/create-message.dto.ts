import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ description: 'Message content', maxLength: 4096 })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  content: string;

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
