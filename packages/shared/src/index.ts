export enum AppRole {
  ADMIN = 'ADMIN',
  MUSICIAN = 'MUSICIAN',
}

export enum ScheduleEventType {
  SERVICE = 'SERVICE',
  REHEARSAL = 'REHEARSAL',
  SPECIAL = 'SPECIAL',
}

export enum InstrumentRole {
  VOCAL = 'VOCAL',
  GUITAR = 'GUITAR',
  BASS = 'BASS',
  DRUMS = 'DRUMS',
  KEYS = 'KEYS',
  VIOLAO = 'VIOLAO',
  DIRETOR_MUSICAL = 'DIRETOR_MUSICAL',
  MINISTRO_RESPONSAVEL = 'MINISTRO_RESPONSAVEL',
  VS = 'VS',
}

export enum MemberStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING = 'PENDING',
  DECLINED = 'DECLINED',
}

export enum MessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export interface ScheduleSummary {
  id: string;
  title: string;
  date: string;
  time: string;
  eventType: ScheduleEventType;
  unreadCount: number;
  memberCount: number;
}

export interface SongDto {
  id: string;
  name: string;
  key: string;
  bpm?: number | null;
  youtubeUrl?: string | null;
  position: number;
  leadSingerUserId?: string | null;
  leadSingerName?: string | null;
}

export interface ChatMessageDto {
  id: string;
  content?: string | null;
  type: MessageType;
  audioUrl?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}
