import {
  AppRole,
  InstrumentRole,
  MemberStatus,
  MessageType,
  ScheduleEventType,
} from '@korus/shared';
import { MinistrySongView, NotificationView, ScheduleView, SessionUser } from '@/types';

export const mockUser: SessionUser = {
  id: 'user-admin',
  name: 'Ana Clara',
  email: 'ana@korus.app',
  role: AppRole.ADMIN,
};

export const mockSchedules: ScheduleView[] = [
  {
    id: 'schedule-1',
    title: 'Culto de Domingo',
    date: '2026-04-26',
    time: '19:00',
    eventType: ScheduleEventType.SERVICE,
    eventLabel: 'Culto da noite',
    notes: 'Passar a ponte de Gratidao com click em 82 BPM.',
    unreadCount: 4,
    memberCount: 5,
    members: [
      { id: 'member-1', userId: 'user-admin', userName: 'Ana Clara', role: InstrumentRole.VOCAL, status: MemberStatus.CONFIRMED },
      { id: 'member-2', userId: 'user-2', userName: 'Joao Victor', role: InstrumentRole.GUITAR, status: MemberStatus.CONFIRMED },
      { id: 'member-3', userId: 'user-3', userName: 'Debora Lima', role: InstrumentRole.KEYS, status: MemberStatus.PENDING },
      { id: 'member-4', userId: 'user-4', userName: 'Rafael Souza', role: InstrumentRole.BASS, status: MemberStatus.CONFIRMED },
      { id: 'member-5', userId: 'user-5', userName: 'Matheus Dias', role: InstrumentRole.DRUMS, status: MemberStatus.DECLINED },
    ],
    songs: [
      { id: 'song-1', name: 'Grande e o Senhor', key: 'G', bpm: 82, youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', position: 0 },
      { id: 'song-2', name: 'Bondade de Deus', key: 'A', bpm: 70, youtubeUrl: 'https://www.youtube.com/watch?v=K8P4JWSZ0F8', position: 1 },
      { id: 'song-3', name: 'Eu Navegarei', key: 'D', bpm: 92, youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', position: 2 },
    ],
    messages: [
      {
        id: 'message-1',
        content: 'Pessoal, vamos manter a introdução enxuta na segunda música.',
        type: MessageType.TEXT,
        createdAt: '2026-04-25T12:00:00.000Z',
        user: { id: 'user-admin', name: 'Ana Clara' },
      },
      {
        id: 'message-2',
        content: 'Fechado, vou revisar os timbres hoje.',
        type: MessageType.TEXT,
        createdAt: '2026-04-25T12:04:00.000Z',
        user: { id: 'user-3', name: 'Debora Lima' },
      },
    ],
  },
  {
    id: 'schedule-2',
    title: 'Ensaio de Quarta',
    date: '2026-04-29',
    time: '20:00',
    eventType: ScheduleEventType.REHEARSAL,
    eventLabel: 'Ensaio geral',
    notes: 'Testar nova ordem da setlist.',
    unreadCount: 1,
    memberCount: 4,
    members: [],
    songs: [],
    messages: [],
  },
];

export const mockNotifications: NotificationView[] = [
  {
    id: 'notification-1',
    title: 'Nova escala',
    body: 'Você foi adicionado ao Culto de Domingo.',
    createdAt: '2026-04-25T12:10:00.000Z',
    readAt: null,
  },
];

export const mockRepertoire: MinistrySongView[] = [
  {
    id: 'lib-1',
    name: 'Grande e o Senhor',
    key: 'G',
    bpm: 82,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    position: 0,
    category: 'Adoracao',
    lastPlayed: '2026-04-12',
    tags: ['abertura', 'congregacional'],
  },
  {
    id: 'lib-2',
    name: 'Bondade de Deus',
    key: 'A',
    bpm: 70,
    youtubeUrl: 'https://www.youtube.com/watch?v=K8P4JWSZ0F8',
    position: 1,
    category: 'Ministracao',
    lastPlayed: '2026-04-19',
    tags: ['intimista', 'ceia'],
  },
  {
    id: 'lib-3',
    name: 'Eu Navegarei',
    key: 'D',
    bpm: 92,
    youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    position: 2,
    category: 'Celebracao',
    lastPlayed: '2026-04-05',
    tags: ['alegre', 'encerramento'],
  },
  {
    id: 'lib-4',
    name: 'Santo Pra Sempre',
    key: 'C',
    bpm: 68,
    youtubeUrl: 'https://www.youtube.com/watch?v=9jD8p4N6D3I',
    position: 3,
    category: 'Adoracao',
    lastPlayed: '2026-03-30',
    tags: ['adoração', 'forte'],
  },
  {
    id: 'lib-5',
    name: 'A Ele a Gloria',
    key: 'E',
    bpm: 76,
    youtubeUrl: 'https://www.youtube.com/watch?v=4Tr0otuiQuU',
    position: 4,
    category: 'Resposta',
    lastPlayed: '2026-04-20',
    tags: ['igreja', 'resposta'],
  },
];
