import {
  AppRole,
  ChatMessageDto,
  InstrumentRole,
  MemberStatus,
  ScheduleEventType,
  SongDto,
} from '@louvy/shared';

export type AppSection =
  | 'notices'
  | 'schedules'
  | 'repertoire'
  | 'members'
  | 'calendar'
  | 'fellowship'
  | 'settings';
export type AuthMode = 'login' | 'register';

export type MinistryAssignment =
  | 'VOCAL'
  | 'BATERIA'
  | 'BAIXO'
  | 'GUITARRA'
  | 'TECLADO'
  | 'VIOLAO'
  | 'DIRETOR_MUSICAL'
  | 'MINISTRO_RESPONSAVEL'
  | 'VS';

export type VocalRange = 'BARITONO' | 'TENOR' | 'CONTRALTO' | 'SOPRANO' | 'MEZZO';

export type AvailabilityTimeSlot = 'ANY' | 'MORNING' | 'AFTERNOON' | 'NIGHT';

export type AvailabilityRecurrence =
  | 'NONE'
  | 'WEEKLY'
  | 'FIRST_SUNDAY_MONTHLY'
  | 'MONTHLY_BY_DAY'
  | 'BIWEEKLY'
  | 'SUNDAY_MORNING_WEEKLY'
  | 'SUNDAY_NIGHT_WEEKLY';

export interface ScheduleMemberView {
  id: string;
  userId: string;
  userName: string;
  role: InstrumentRole;
  status: MemberStatus;
  vocalRange?: VocalRange | null;
  declineReason?: string | null;
  canManageSetlist?: boolean;
}

export interface NotificationView {
  id: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface MemberDirectoryProfile {
  userId: string;
  name: string;
  email: string;
  appRole: AppRole;
  assignments: MinistryAssignment[];
  vocalRanges: VocalRange[];
  notes?: string;
  birthday?: string | null;
}

export interface MemberDirectoryInput {
  userId: string;
  appRole: AppRole;
  assignments: MinistryAssignment[];
  vocalRanges: VocalRange[];
  notes?: string;
  birthday?: string | null;
}

export interface AvailabilityBlock {
  id: string;
  userId: string;
  userName: string;
  date: string;
  reason: string;
  timeSlot: AvailabilityTimeSlot;
  recurrence: AvailabilityRecurrence;
  createdAt: string;
}

export interface AvailabilityBlockInput {
  id?: string;
  userId?: string;
  date: string;
  reason: string;
  timeSlot: AvailabilityTimeSlot;
  recurrence: AvailabilityRecurrence;
}

export interface ScheduleView {
  id: string;
  title: string;
  date: string;
  time: string;
  eventType: ScheduleEventType;
  eventLabel: string;
  notes?: string | null;
  unreadCount: number;
  memberCount: number;
  members: ScheduleMemberView[];
  songs: SongDto[];
  messages: ChatMessageDto[];
}

export interface MinistrySongView extends SongDto {
  category: string;
  lastPlayed?: string;
  tags: string[];
  artist?: string;
  durationSeconds?: number | null;
}

export interface RepertoireSongInput {
  id?: string;
  name: string;
  artist?: string;
  key: string;
  bpm?: number | null;
  durationSeconds?: number | null;
  youtubeUrl?: string;
  category: string;
  tags: string[];
}

export interface ScheduleEditorInput {
  id?: string;
  title: string;
  date: string;
  time: string;
  eventType: ScheduleEventType;
  eventLabel: string;
  notes?: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}
