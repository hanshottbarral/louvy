export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function youtubeEmbedUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const videoId =
      parsed.hostname.includes('youtu.be')
        ? parsed.pathname.replace('/', '')
        : parsed.searchParams.get('v');

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export function getWeekdayLabel(date: string) {
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(`${date}T12:00:00`));
}

export function getMonthDayLabel(date: string) {
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`));
}

export function formatScheduleDate(date: string) {
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || Number.isNaN(seconds) || seconds <= 0) {
    return '--:--';
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function parseDurationInput(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(':').map((part) => part.trim());
  if (parts.length === 2 && parts.every((part) => /^\d+$/.test(part))) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  return null;
}

const churchWordReplacements: Array<[RegExp, string]> = [
  [/\bAdoracao\b/gi, 'Adoração'],
  [/\bCelebracao\b/gi, 'Celebração'],
  [/\bMinistracao\b/gi, 'Ministração'],
  [/\bMinisterio\b/gi, 'Ministério'],
  [/\bRepertorio\b/gi, 'Repertório'],
  [/\bObservacoes\b/gi, 'Observações'],
  [/\bPermissao\b/gi, 'Permissão'],
  [/\bConfiguracoes\b/gi, 'Configurações'],
  [/\bCalendario\b/gi, 'Calendário'],
  [/\bComunhao\b/gi, 'Comunhão'],
  [/\bNao\b/gi, 'Não'],
  [/\bnao\b/gi, 'não'],
  [/\bVoce\b/gi, 'Você'],
  [/\bOla\b/gi, 'Olá'],
  [/\bMusica\b/gi, 'Música'],
  [/\bmusica\b/gi, 'música'],
  [/\bduracao\b/gi, 'duração'],
  [/\bViolao\b/gi, 'Violão'],
  [/\bResponsavel\b/gi, 'Responsável'],
];

export function prettifyChurchText(value?: string | null) {
  if (!value) {
    return '';
  }

  return churchWordReplacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}
