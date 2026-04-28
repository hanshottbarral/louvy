import { normalizeMusicalKey } from '@/lib/utils';

export interface YoutubeMetadata {
  title: string;
  artist?: string;
  durationSeconds?: number | null;
  key?: string;
  bpm?: number | null;
  tags?: string[];
  cifraUrl?: string;
}

export function extractYoutubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '');
    }

    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop() ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

export function guessTitleAndArtist(rawTitle: string, authorName?: string) {
  const title = rawTitle.trim();
  const normalizedAuthor = authorName?.trim();
  const cleanAuthor = normalizedAuthor
    ?.replace(/\s*-\s*topic$/i, '')
    .replace(/\s*oficial$/i, '')
    .trim();
  const separators = [' - ', ' | ', ' – ', ' — '];

  if (cleanAuthor) {
    const escapedAuthor = cleanAuthor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const separator of separators) {
      const prefixedByAuthor = new RegExp(`^${escapedAuthor}\\s*${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (prefixedByAuthor.test(title)) {
        return {
          artist: cleanAuthor,
          title: title.replace(prefixedByAuthor, '').trim(),
        };
      }

      const suffixedByAuthor = new RegExp(`${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${escapedAuthor}$`, 'i');
      if (suffixedByAuthor.test(title)) {
        return {
          artist: cleanAuthor,
          title: title.replace(suffixedByAuthor, '').trim(),
        };
      }
    }

    return {
      artist: cleanAuthor,
      title,
    };
  }

  for (const separator of separators) {
    if (title.includes(separator)) {
      const [left, ...rest] = title.split(separator);
      const right = rest.join(separator).trim();

      if (left.trim() && right) {
        return {
          artist: left.trim(),
          title: right,
        };
      }
    }
  }

  return {
    artist: cleanAuthor || undefined,
    title,
  };
}

export function extractBpm(text: string) {
  const match = text.match(/\b(?:bpm[:\s-]*)?(\d{2,3})\s*bpm\b/i) ?? text.match(/\bbpm[:\s-]*(\d{2,3})\b/i);
  return match ? Number(match[1]) : null;
}

export function extractKey(text: string) {
  const match =
    text.match(/\b(?:tom|key|tone)[:\s-]*([A-G](?:#|b)?m?)\b/i) ??
    text.match(/\b([A-G](?:#|b)?m?)\s*(?:tom|key)\b/i);

  return match ? normalizeMusicalKey(match[1]) : '';
}

export function suggestTagsFromYoutubeText(text: string) {
  const normalized = text.toLowerCase();
  const suggestions = new Set<string>();

  const rules: Array<[RegExp, string]> = [
    [/\b(abertura|entrada|inicio)\b/i, 'Abertura'],
    [/\b(encerramento|finale|final)\b/i, 'Encerramento'],
    [/\b(culto|igreja|church service)\b/i, 'Culto'],
    [/\b(adora[cç][aã]o|worship)\b/i, 'Adoração'],
    [/\b(ministra[cç][aã]o|ministry)\b/i, 'Ministração'],
    [/\b(celebra[cç][aã]o|celebration)\b/i, 'Celebração'],
    [/\b(ofert[oó]rio|oferta)\b/i, 'Ofertório'],
    [/\b(comunh[aã]o|ceia)\b/i, 'Comunhão'],
    [/\b(gl[oó]ria|exaltado|exalta[cç][aã]o|magnificado)\b/i, 'Exaltação'],
    [/\b(santo|santidade)\b/i, 'Santidade'],
    [/\b(gra[cç]a|favor)\b/i, 'Graça'],
    [/\b(cruz|sangue|calv[aá]rio)\b/i, 'Cruz'],
    [/\b(esp[ií]rito|fogo)\b/i, 'Espírito Santo'],
    [/\b(poder|milagre)\b/i, 'Poder'],
    [/\b(alegria|festa|celebra)\b/i, 'Celebração'],
  ];

  for (const [pattern, tag] of rules) {
    if (pattern.test(normalized)) {
      suggestions.add(tag);
    }
  }

  if (suggestions.size === 0) {
    suggestions.add('Culto');
  }

  return Array.from(suggestions);
}
