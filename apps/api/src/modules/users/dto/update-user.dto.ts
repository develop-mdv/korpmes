import { IsOptional, IsString, IsUrl, MaxLength, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeUsername, USERNAME_DESCRIPTION, USERNAME_PATTERN } from '@corp/shared-constants';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'ivan_petrov', description: USERNAME_DESCRIPTION })
  @Transform(({ obj }) => typeof obj.username === 'string' ? normalizeUsername(obj.username) : obj.username)
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(USERNAME_PATTERN, { message: USERNAME_DESCRIPTION })
  username?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value)
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Номер телефона должен быть в международном формате, например +79991234567' })
  phone?: string | null;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
