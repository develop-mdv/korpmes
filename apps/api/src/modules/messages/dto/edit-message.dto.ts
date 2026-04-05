import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({ description: 'Updated message content', maxLength: 4096 })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  content: string;
}
