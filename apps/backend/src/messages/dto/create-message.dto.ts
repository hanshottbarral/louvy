import { MessageType } from '@louvy/shared';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  scheduleId!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsEnum(MessageType)
  type!: MessageType;

  @IsOptional()
  @IsUrl()
  audioUrl?: string;
}

