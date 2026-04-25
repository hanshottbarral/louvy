import {
  AppRole,
  ChatMessageDto,
  InstrumentRole,
  MemberStatus,
  ScheduleEventType,
  SongDto,
} from '@louvy/shared';

export type AppSection = 'schedules' | 'repertoire';
export type AuthMode = 'login' | 'register';

export interface ScheduleMemberView {
  id: string;
  userId: string;
  userName: string;
  role: InstrumentRole;
  status: MemberStatus;
}

export interface NotificationView {
  id: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
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
