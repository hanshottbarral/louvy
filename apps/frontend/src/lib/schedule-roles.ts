import { InstrumentRole } from '@korus/shared';
import { MemberDirectoryProfile, MinistryAssignment } from '@/types';

const assignmentToScheduleRoles: Record<MinistryAssignment, InstrumentRole[]> = {
  VOCAL: [InstrumentRole.VOCAL],
  BATERIA: [InstrumentRole.DRUMS],
  BAIXO: [InstrumentRole.BASS],
  GUITARRA: [InstrumentRole.GUITAR],
  TECLADO: [InstrumentRole.KEYS],
  VIOLAO: [InstrumentRole.VIOLAO],
  DIRETOR_MUSICAL: [InstrumentRole.DIRETOR_MUSICAL],
  MINISTRO_RESPONSAVEL: [InstrumentRole.MINISTRO_RESPONSAVEL],
  VS: [InstrumentRole.VS],
};

export function getAllowedScheduleRoles(profile?: MemberDirectoryProfile) {
  if (!profile) {
    return [] as InstrumentRole[];
  }

  const roles = new Set<InstrumentRole>();
  for (const assignment of profile.assignments) {
    for (const role of assignmentToScheduleRoles[assignment] ?? []) {
      roles.add(role);
    }
  }

  return Array.from(roles);
}
