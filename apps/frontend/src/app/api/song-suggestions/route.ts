import { NextRequest, NextResponse } from 'next/server';
import { guessTitleAndArtist } from '@/lib/youtube-metadata';

export const runtime = 'nodejs';

interface SongSuggestion {
  title: string;
  artist?: string;
  youtubeUrl: string;
  cifraUrl?: string;
}

function slugifyLookup(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(clipe|oficial|official|audio|video|ao vivo|live)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildCifraClubCandidates(artist?: string, title?: string) {
  const artistSlug = slugifyLookup(artist ?? '');
  const titleSlug = slugifyLookup(title ?? '');

  if (!artistSlug || !titleSlug) {
    return [];
  }

  return [`https://www.cifraclub.com.br/${artistSlug}/${titleSlug}/`];
}

async function fetchText(url: string, timeoutMs = 2500) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}`);
  }

  return response.text();
}

function decodeDuckDuckGoHref(value: string) {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https:${value}`);
    return parsed.searchParams.get('uddg') ?? value;
  } catch {
    return value;
  }
}

async function searchDuckDuckGo(query: string) {
  try {
    const html = await fetchText(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      1800,
    );
    const urls = [...html.matchAll(/result__a" href="([^"]+)"/g)]
      .map((match) => decodeDuckDuckGoHref(match[1]))
      .filter((url) => url.includes('cifraclub.com.br'));
    return Array.from(new Set(urls));
  } catch {
    return [] as string[];
  }
}

function parseCifraClubKey(html: string) {
  const sideTomMatch = html.match(/id="side-tom"[\s\S]*?<ul><li>\s*½ Tom<\/li><li>([A-G][#b]?(?:m)?)<i>/i);
  if (sideTomMatch?.[1]) {
    return sideTomMatch[1].toUpperCase();
  }

  const inlineTomMatch = html.match(/\bTom[:\s]*<\/[^>]+>\s*<[^>]+>\s*([A-G][#b]?(?:m)?)/i);
  return inlineTomMatch?.[1]?.toUpperCase() || '';
}

async function resolveSuggestionCifraUrl(artist?: string, title?: string) {
  if (!artist || !title) {
    return undefined;
  }

  const candidates = [
    ...buildCifraClubCandidates(artist, title),
    ...(await searchDuckDuckGo(`${artist} ${title} cifra club`)),
  ];

  for (const url of Array.from(new Set(candidates)).slice(0, 3)) {
    if (!url.includes('cifraclub.com.br')) {
      continue;
    }

    try {
      const html = await fetchText(url, 2200);
      if (parseCifraClubKey(html)) {
        return url;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function decodeYoutubeText(value?: string) {
  if (!value) {
    return '';
  }

  return value
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&');
}

function parseYoutubeSearchSuggestions(html: string) {
  const suggestions: SongSuggestion[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/"videoId":"([^"]+)"/g)) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) {
      continue;
    }

    const start = match.index ?? 0;
    const chunk = html.slice(start, start + 5000);
    const titleMatch = chunk.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/);
    const channelMatch = chunk.match(/"longBylineText":\{"runs":\[\{"text":"([^"]+)"/);
    const rawTitle = decodeYoutubeText(titleMatch?.[1]);
    const channel = decodeYoutubeText(channelMatch?.[1]);

    if (!rawTitle) {
      continue;
    }

    const guessed = guessTitleAndArtist(rawTitle, channel);
    suggestions.push({
      title: guessed.title,
      artist: guessed.artist,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
    seen.add(videoId);

    if (suggestions.length >= 6) {
      break;
    }
  }

  return suggestions;
}

async function enrichSuggestionsWithCifra(suggestions: SongSuggestion[]) {
  return Promise.all(
    suggestions.map(async (suggestion) => ({
      ...suggestion,
      cifraUrl: await resolveSuggestionCifraUrl(suggestion.artist, suggestion.title),
    })),
  );
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] satisfies SongSuggestion[] });
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 0 },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] satisfies SongSuggestion[] });
    }

    const html = await response.text();
    const suggestions = parseYoutubeSearchSuggestions(html);
    return NextResponse.json({
      suggestions: await enrichSuggestionsWithCifra(suggestions),
    });
  } catch {
    return NextResponse.json({ suggestions: [] satisfies SongSuggestion[] });
  }
}
