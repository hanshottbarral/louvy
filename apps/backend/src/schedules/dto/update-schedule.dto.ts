import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto, CreateScheduleMemberDto } from './create-schedule.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemberStatus } from '@korus/shared';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class UpdateScheduleMemberStatusDto {
  @IsString()
  memberId!: string;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}

