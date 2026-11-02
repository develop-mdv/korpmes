import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayUnique,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ChatType } from '../entities/chat.entity';

export class CreateChatDto {
  @ApiProperty({ enum: ChatType })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiPropertyOptional({ description: 'Required for GROUP and CHANNEL types' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ type: [String], description: 'UUIDs of members to add' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  memberIds: string[];

  @ApiPropertyOptional({ description: 'Omit or use null for personal chats' })
  @IsOptional()
  @IsUUID()
  organizationId?: string | null;
}
