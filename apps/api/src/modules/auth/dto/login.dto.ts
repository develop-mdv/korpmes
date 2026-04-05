import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'TOTP code for 2FA', minLength: 6, maxLength: 6 })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  twoFactorCode?: string;
}
