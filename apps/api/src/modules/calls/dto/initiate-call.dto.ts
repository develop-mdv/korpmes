import { IsUUID, IsEnum } from 'class-validator';
import { CallType } from '@corp/shared-types';

export class InitiateCallDto {
  @IsUUID()
  chatId: string;

  @IsEnum(CallType)
  type: CallType;
}
