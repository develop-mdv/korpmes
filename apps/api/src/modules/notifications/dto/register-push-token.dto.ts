import { IsString, IsEnum } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsEnum(['web', 'ios', 'android'])
  platform: 'web' | 'ios' | 'android';
}
