export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function youtubeEmbedUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  try {
    const videoId = extractYoutubeVideoId(url);

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export function extractYoutubeVideoId(url?: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shortsMatch?.[1]) {
      return shortsMatch[1];
    }

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null;
    }

    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

export function youtubePlaylistUrl(urls: Array<string | null | undefined>) {
  const videoIds = urls
    .map((url) => extractYoutubeVideoId(url))
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  if (!videoIds.length) {
    return null;
  }

  return `https://www.youtube.com/watch_videos?video_ids=${encodeURIComponent(videoIds.join(','))}`;
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
