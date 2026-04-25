import { InstrumentRole, MemberStatus, ScheduleEventType } from '@louvy/shared';

export const instrumentRoleLabel: Record<InstrumentRole, string> = {
  VOCAL: 'Vocal',
  GUITAR: 'Guitarra',
  BASS: 'Baixo',
  DRUMS: 'Bateria',
  KEYS: 'Teclado',
};

export const memberStatusLabel: Record<MemberStatus, string> = {
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  DECLINED: 'Recusado',
};

export const scheduleEventTypeLabel: Record<ScheduleEventType, string> = {
  SERVICE: 'Culto',
  REHEARSAL: 'Ensaio',
  SPECIAL: 'Especial',
};
