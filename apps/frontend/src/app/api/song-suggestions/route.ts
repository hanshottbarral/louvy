import { NextRequest, NextResponse } from 'next/server';
import { guessTitleAndArtist } from '@/lib/youtube-metadata';

export const runtime = 'nodejs';

interface SongSuggestion {
  title: string;
  artist?: string;
  youtubeUrl: string;
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
    return NextResponse.json({
      suggestions: parseYoutubeSearchSuggestions(html),
    });
  } catch {
    return NextResponse.json({ suggestions: [] satisfies SongSuggestion[] });
  }
}
