import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestJoinDto {
  @ApiProperty({ required: false, description: 'Optional message to organization owners' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
