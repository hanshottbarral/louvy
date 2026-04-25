import {
  InstrumentRole,
  MemberStatus,
  MessageType,
  ScheduleEventType,
} from '@louvy/shared';
import { MinistrySongView, NotificationView, ScheduleView } from '@/types';

interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  role: 'ADMIN' | 'MUSICIAN';
}

interface ScheduleRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  event_type: ScheduleEventType;
  event_label: string;
  notes: string | null;
}

interface ScheduleMemberRow {
  id: string;
  schedule_id: string;
  user_id: string;
  role: keyof typeof InstrumentRole;
  status: keyof typeof MemberStatus;
}

interface ScheduleSongRow {
  id: string;
  schedule_id: string;
  name: string;
  musical_key: string;
  bpm: number | null;
  youtube_url: string | null;
  position: number;
}

interface MessageRow {
  id: string;
  schedule_id: string;
  user_id: string;
  content: string | null;
  type: MessageType;
  audio_url: string | null;
  created_at: string;
}

interface RepertoireSongRow {
  id: string;
  name: string;
  musical_key: string;
  bpm: number | null;
  youtube_url: string | null;
  category: string;
  tags: string[] | null;
  created_at: string;
}

export function mapSchedules(args: {
  schedules: ScheduleRow[];
  members: ScheduleMemberRow[];
  songs: ScheduleSongRow[];
  profiles: ProfileRow[];
}): ScheduleView[] {
  const profileMap = new Map(args.profiles.map((profile) => [profile.id, profile]));

  return args.schedules.map((schedule) => {
    const members = args.members
      .filter((member) => member.schedule_id === schedule.id)
      .map((member) => ({
        id: member.id,
        userId: member.user_id,
        userName: profileMap.get(member.user_id)?.name ?? 'Membro',
        role: InstrumentRole[member.role],
        status: MemberStatus[member.status],
      }));

    const scheduleSongs = args.songs
      .filter((song) => song.schedule_id === schedule.id)
      .sort((a, b) => a.position - b.position)
      .map((song) => ({
        id: song.id,
        name: song.name,
        key: song.musical_key,
        bpm: song.bpm,
        youtubeUrl: song.youtube_url,
        position: song.position,
      }));

    return {
      id: schedule.id,
      title: schedule.title,
      date: schedule.event_date,
      time: schedule.event_time.slice(0, 5),
      eventType: schedule.event_type,
      eventLabel: schedule.event_label,
      notes: schedule.notes,
      unreadCount: 0,
      memberCount: members.length,
      members,
      songs: scheduleSongs,
      messages: [],
    };
  });
}

export function mapMessages(rows: MessageRow[], profiles: ProfileRow[]) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((message) => ({
      id: message.id,
      content: message.content,
      type: message.type,
      audioUrl: message.audio_url,
      createdAt: message.created_at,
      user: {
        id: message.user_id,
        name: profileMap.get(message.user_id)?.name ?? 'Integrante',
      },
    }));
}

export function mapRepertoire(rows: RepertoireSongRow[]): MinistrySongView[] {
  return rows.map((song, index) => ({
    id: song.id,
    name: song.name,
    key: song.musical_key,
    bpm: song.bpm,
    youtubeUrl: song.youtube_url,
    position: index,
    category: song.category,
    lastPlayed: song.created_at.slice(0, 10),
    tags: song.tags ?? [],
  }));
}

export function mapNotifications(
  rows: Array<{
    id: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
  }>,
): NotificationView[] {
  return rows.map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    readAt: notification.read_at,
    createdAt: notification.created_at,
  }));
}
