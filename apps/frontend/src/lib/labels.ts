import { InstrumentRole, MemberStatus, ScheduleEventType } from '@louvy/shared';
import {
  AvailabilityRecurrence,
  AvailabilityTimeSlot,
  MinistryAssignment,
  VocalRange,
} from '@/types';

export const instrumentRoleLabel: Record<InstrumentRole, string> = {
  VOCAL: 'Vocal',
  GUITAR: 'Guitarra',
  BASS: 'Baixo',
  DRUMS: 'Bateria',
  KEYS: 'Teclado',
  VIOLAO: 'Violão',
  DIRETOR_MUSICAL: 'Diretor musical',
  MINISTRO_RESPONSAVEL: 'Ministro responsável',
  VS: 'VS',
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

export const ministryAssignmentLabel: Record<MinistryAssignment, string> = {
  VOCAL: 'Vocal',
  BATERIA: 'Bateria',
  BAIXO: 'Baixo',
  GUITARRA: 'Guitarra',
  TECLADO: 'Teclado',
  VIOLAO: 'Violão',
  DIRETOR_MUSICAL: 'Diretor musical',
  MINISTRO_RESPONSAVEL: 'Ministro responsável',
  VS: 'VS',
};

export const vocalRangeLabel: Record<VocalRange, string> = {
  BARITONO: 'Barítono',
  TENOR: 'Tenor',
  CONTRALTO: 'Contralto',
  SOPRANO: 'Soprano',
  MEZZO: 'Mezzo',
};

export const availabilityTimeSlotLabel: Record<AvailabilityTimeSlot, string> = {
  ANY: 'Dia inteiro',
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noite',
};

export const availabilityRecurrenceLabel: Record<AvailabilityRecurrence, string> = {
  NONE: 'Não repetir',
  WEEKLY: 'Toda semana',
  FIRST_SUNDAY_MONTHLY: 'Todo mês no primeiro domingo',
  MONTHLY_BY_DAY: 'Todo mês no dia selecionado',
  BIWEEKLY: 'A cada 15 dias',
  SUNDAY_MORNING_WEEKLY: 'Todo domingo de manhã',
  SUNDAY_NIGHT_WEEKLY: 'Todo domingo à noite',
};
