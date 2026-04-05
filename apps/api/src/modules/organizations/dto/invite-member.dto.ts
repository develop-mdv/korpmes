import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEmail,
  IsEnum,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  GUEST = 'GUEST',
}

export class InviteMemberDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'A valid email is required when phone is not provided' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @ValidateIf((o) => !o.email)
  @IsString({ message: 'A valid phone number is required when email is not provided' })
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: OrgRole, default: OrgRole.EMPLOYEE })
  @IsEnum(OrgRole)
  role: OrgRole;
}
