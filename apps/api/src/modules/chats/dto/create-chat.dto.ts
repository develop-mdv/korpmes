import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ChatType } from '../entities/chat.entity';

export class CreateChatDto {
  @ApiProperty({ enum: ChatType })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiPropertyOptional({ description: 'Required for GROUP and CHANNEL types' })
  @ValidateIf((o) => o.type === ChatType.GROUP || o.type === ChatType.CHANNEL)
  @IsString()
  @IsNotEmpty({ message: 'Name is required for group and channel chats' })
  @IsOptional()
  name?: string;

  @ApiProperty({ type: [String], description: 'UUIDs of members to add' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  memberIds: string[];

  @ApiProperty()
  @IsUUID()
  organizationId: string;
}
