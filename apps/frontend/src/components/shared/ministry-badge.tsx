'use client';

import { InstrumentRole } from '@korus/shared';
import { Computer, Drum, Guitar, Headphones, MicVocal, Piano, Music2 } from 'lucide-react';
import { instrumentRoleLabel, ministryAssignmentLabel, vocalRangeLabel } from '@/lib/labels';
import { MinistryAssignment, VocalRange } from '@/types';

const vocalRangeColorClass: Record<VocalRange, string> = {
  BARITONO: 'text-black',
  TENOR: 'text-sky-600',
  CONTRALTO: 'text-emerald-600',
  SOPRANO: 'text-pink-500',
  MEZZO: 'text-violet-600',
};

function getRoleIcon(role: MinistryAssignment | InstrumentRole) {
  switch (role) {
    case 'VOCAL':
      return MicVocal;
    case 'BATERIA':
    case 'DRUMS':
      return Drum;
    case 'BAIXO':
    case 'BASS':
      return Guitar;
    case 'GUITARRA':
    case 'GUITAR':
      return Guitar;
    case 'TECLADO':
    case 'KEYS':
      return Piano;
    case 'VIOLAO':
      return Guitar;
    case 'VS':
      return Computer;
    case 'DIRETOR_MUSICAL':
      return Headphones;
    case 'MINISTRO_RESPONSAVEL':
      return Music2;
    default:
      return Music2;
  }
}

export function MinistryBadge({
  role,
  vocalRange,
  showLabel = true,
}: {
  role: MinistryAssignment | InstrumentRole;
  vocalRange?: VocalRange | null;
  showLabel?: boolean;
}) {
  const Icon = getRoleIcon(role);
  const isVocal = role === 'VOCAL';
  const vocalClass = vocalRange ? vocalRangeColorClass[vocalRange] : 'text-[var(--accent-strong)]';
  const label =
    role === 'VOCAL' && vocalRange
      ? `${ministryAssignmentLabel.VOCAL} • ${vocalRangeLabel[vocalRange]}`
      : ministryAssignmentLabel[role as MinistryAssignment] ??
        instrumentRoleLabel[role as InstrumentRole] ??
        role;

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">
      <Icon size={14} className={isVocal ? vocalClass : 'text-[var(--accent-strong)]'} />
      {showLabel ? label : null}
    </span>
  );
}
