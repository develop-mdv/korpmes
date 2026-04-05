import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReactionDto {
  @ApiProperty({ description: 'Emoji character(s)', maxLength: 10 })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  emoji: string;
}
