import {
  InstrumentRole,
  MemberStatus,
  ScheduleEventType,
} from '@korus/shared';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(InstrumentRole)
  role!: InstrumentRole;

  @IsEnum(MemberStatus)
  status!: MemberStatus;
}

export class CreateScheduleDto {
  @IsString()
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  time!: string;

  @IsEnum(ScheduleEventType)
  eventType!: ScheduleEventType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleMemberDto)
  members!: CreateScheduleMemberDto[];
}

