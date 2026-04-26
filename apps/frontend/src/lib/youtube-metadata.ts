export interface YoutubeMetadata {
  title: string;
  artist?: string;
  durationSeconds?: number | null;
  key?: string;
  bpm?: number | null;
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
  const separators = [' - ', ' | ', ' – ', ' — '];

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
    artist: authorName?.trim() || undefined,
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

  return match ? match[1].toUpperCase() : '';
}
