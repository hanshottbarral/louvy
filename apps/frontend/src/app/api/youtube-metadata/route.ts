import { NextRequest, NextResponse } from 'next/server';
import {
  extractBpm,
  extractKey,
  extractYoutubeVideoId,
  guessTitleAndArtist,
  suggestTagsFromYoutubeText,
  YoutubeMetadata,
} from '@/lib/youtube-metadata';
import { normalizeMusicalKey, normalizeTagLabel } from '@/lib/utils';

export const runtime = 'nodejs';
const youtubeMetadataCache = new Map<string, YoutubeMetadata>();

function parseDurationSeconds(pageHtml: string) {
  const jsonLdDurationMatch = pageHtml.match(/"duration":"PT(?:(\d+)M)?(?:(\d+)S)?"/i);
  if (jsonLdDurationMatch) {
    const minutes = Number(jsonLdDurationMatch[1] ?? 0);
    const seconds = Number(jsonLdDurationMatch[2] ?? 0);
    return minutes * 60 + seconds;
  }

  const lengthSecondsMatch = pageHtml.match(/"lengthSeconds":"(\d+)"/);
  if (lengthSecondsMatch) {
    return Number(lengthSecondsMatch[1]);
  }

  const approxDurationMatch = pageHtml.match(/"approxDurationMs":"(\d+)"/);
  return approxDurationMatch ? Math.round(Number(approxDurationMatch[1]) / 1000) : null;
}

function parseYoutubePlayerPayload(payloadText: string) {
  try {
    const parsed = JSON.parse(payloadText);
    const playerResponse =
      parsed?.playerResponse ??
      (Array.isArray(parsed) ? parsed.find((entry) => entry?.playerResponse)?.playerResponse : null);
    const videoDetails = playerResponse?.videoDetails;

    if (!videoDetails) {
      return null;
    }

    return {
      title: videoDetails.title as string | undefined,
      author: videoDetails.author as string | undefined,
      shortDescription: videoDetails.shortDescription as string | undefined,
      lengthSeconds: videoDetails.lengthSeconds ? Number(videoDetails.lengthSeconds) : null,
      keywords: Array.isArray(videoDetails.keywords) ? (videoDetails.keywords as string[]) : [],
    };
  } catch {
    return null;
  }
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

function decodeDuckDuckGoHref(value: string) {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https:${value}`);
    return parsed.searchParams.get('uddg') ?? value;
  } catch {
    return value;
  }
}

async function fetchText(url: string, extraHeaders?: Record<string, string>, timeoutMs = 4500) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ...extraHeaders,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}`);
  }

  return response.text();
}

async function searchDuckDuckGo(query: string) {
  try {
    const html = await fetchText(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      undefined,
      2200,
    );
    const urls = [...html.matchAll(/result__a" href="([^"]+)"/g)]
      .map((match) => decodeDuckDuckGoHref(match[1]))
      .filter(Boolean);
    return Array.from(new Set(urls));
  } catch {
    return [] as string[];
  }
}

function parseSongBpmMetrics(html: string) {
  const bpmMatch = html.match(/Tempo \(BPM\)\s*<\/dt>\s*<dd[^>]*>\s*([^<\s]+)/i);
  const durationMatch = html.match(/Duration\s*<\/dt>\s*<dd[^>]*>\s*([^<\s]+)/i);
  const keyMatch = html.match(/Key\s*<\/dt>\s*<dd[^>]*>\s*([^<]*)<\/dd>/i);

  const bpm = bpmMatch ? Number(bpmMatch[1]) : null;
  const durationText = durationMatch?.[1] ?? '';
  const durationSeconds = durationText && /^\d+:\d{2}$/.test(durationText)
    ? Number(durationText.split(':')[0]) * 60 + Number(durationText.split(':')[1])
    : null;
  const key = normalizeMusicalKey(
    keyMatch?.[1]
      ?.trim()
      .replace(/♯/g, '#')
      .replace(/♭/g, 'b')
      .split('/')
      .shift() || '',
  );

  return {
    bpm: Number.isFinite(bpm) ? bpm : null,
    durationSeconds,
    key,
  };
}

function parseSongBpmResultText(resultText: string) {
  const bpmMatch = resultText.match(/\bBPM\s+(\d{2,3})\b/i);
  const durationMatch = resultText.match(/\bDuration\s+(\d+:\d{2})\b/i);
  const keyMatch = resultText.match(/\bKey\s+([A-G][#b♯♭]?(?:m|M)?(?:\/[A-G][#b♯♭]?)?)\b/i);

  const bpm = bpmMatch ? Number(bpmMatch[1]) : null;
  const durationText = durationMatch?.[1] ?? '';
  const durationSeconds = durationText
    ? Number(durationText.split(':')[0]) * 60 + Number(durationText.split(':')[1])
    : null;
  const key = normalizeMusicalKey(keyMatch?.[1]?.split('/').shift() ?? '');

  return {
    bpm: Number.isFinite(bpm) ? bpm : null,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    key,
  };
}

function parseCifraClubKey(html: string) {
  const sideTomMatch = html.match(/id="side-tom"[\s\S]*?<ul><li>\s*½ Tom<\/li><li>([A-G][#b]?(?:m)?)<i>/i);
  if (sideTomMatch?.[1]) {
    return sideTomMatch[1].toUpperCase();
  }

  const inlineTomMatch = html.match(/\bTom[:\s]*<\/[^>]+>\s*<[^>]+>\s*([A-G][#b]?(?:m)?)/i);
  return inlineTomMatch?.[1]?.toUpperCase() || '';
}

function parseMetaDescription(html: string) {
  const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);
  return descriptionMatch?.[1] ?? '';
}

function parseWatchTitle(html: string) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (!titleMatch?.[1]) {
    return '';
  }

  return titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim();
}

function mergeTags(...tagArrays: Array<string[] | undefined>) {
  return Array.from(
    new Set(
      tagArrays
        .flat()
        .filter(Boolean)
        .map((tag) => normalizeTagLabel(tag as string)),
    ),
  );
}

async function searchSongBpm(query: string) {
  try {
    const body = new URLSearchParams({ query });
    const searchResponse = await fetch('https://songbpm.com/searches', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://songbpm.com',
        referer: 'https://songbpm.com/',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 0 },
    });

    const location = searchResponse.headers.get('location');
    if (!location) {
      return [] as Array<{ url: string; text: string }>;
    }

    const resultsHtml = await fetchText(`https://songbpm.com${location}`, {
      referer: 'https://songbpm.com/',
    }, 4500);

    return [...resultsHtml.matchAll(/href="(\/@[^"]+)"[^>]*>(.*?)<\/a>/g)]
      .map((match) => ({
        url: `https://songbpm.com${match[1]}`,
        text: match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      }))
      .filter((item) => item.text.toLowerCase().includes(' bpm '));
  } catch {
    return [] as Array<{ url: string; text: string }>;
  }
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

async function findFirstMatchingPage<T>(
  urls: string[],
  matcher: (url: string) => boolean,
  parser: (html: string, url: string) => T | null,
  timeoutMs = 2500,
) {
  for (const url of urls.filter(matcher).slice(0, 4)) {
    try {
      const html = await fetchText(url, undefined, timeoutMs);
      const parsed = parser(html, url);
      if (parsed) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Envie um link do YouTube.' }, { status: 400 });
  }

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'Não consegui identificar o vídeo do YouTube.' }, { status: 400 });
  }

  const cached = youtubeMetadataCache.get(videoId);
  if (cached?.durationSeconds && cached.key && cached.bpm) {
    return NextResponse.json(cached);
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const [oembedResponse, watchResponse, playerResponse] = await Promise.all([
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`, {
        next: { revalidate: 0 },
      }),
      fetch(watchUrl, {
        headers: {
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        next: { revalidate: 0 },
      }),
      fetch(`${watchUrl}&pbj=1`, {
        headers: {
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'x-youtube-client-name': '1',
          'x-youtube-client-version': '2.20201021.03.00',
        },
        next: { revalidate: 0 },
      }),
    ]);

    const oembed = oembedResponse.ok
      ? ((await oembedResponse.json()) as { title: string; author_name?: string })
      : null;
    const watchHtml = watchResponse.ok ? await watchResponse.text() : '';
    const playerPayload = playerResponse.ok ? parseYoutubePlayerPayload(await playerResponse.text()) : null;
    const descriptionMatch = watchHtml.match(/"shortDescription":"(.*?)"/);
    const description = playerPayload?.shortDescription || decodeYoutubeText(descriptionMatch?.[1]);
    const rawTitle = playerPayload?.title || oembed?.title || parseWatchTitle(watchHtml) || 'Nova música';
    const inferred = guessTitleAndArtist(rawTitle, playerPayload?.author || oembed?.author_name);
    const keywordText = playerPayload?.keywords?.join('\n') ?? '';
    const combinedText = `${rawTitle}\n${description}\n${keywordText}`;
    const baseTags = suggestTagsFromYoutubeText(combinedText);

    const [cifraResults, songBpmResults, multitracksResults] = await Promise.all([
      searchDuckDuckGo(`${inferred.artist ?? ''} ${inferred.title} cifra club`),
      searchSongBpm(`${inferred.artist ?? ''} ${inferred.title}`),
      searchDuckDuckGo(`${inferred.artist ?? ''} ${inferred.title} site:multitracks.com.br`),
    ]);

    const cifraCandidates = [
      ...buildCifraClubCandidates(inferred.artist, inferred.title),
      ...cifraResults,
    ];
    const cifraPage = await findFirstMatchingPage(
      cifraCandidates,
      (item) => item.includes('cifraclub.com.br'),
      (html, resultUrl) => {
        const key = normalizeMusicalKey(parseCifraClubKey(html));
        if (!key) {
          return null;
        }

        return {
          url: resultUrl,
          key,
          description: parseMetaDescription(html),
        };
      },
      3500,
    );
    const songBpmPage =
      songBpmResults
        .map((result) => ({
          ...parseSongBpmResultText(result.text),
          url: result.url,
        }))
        .find((result) => result.bpm || result.durationSeconds || result.key) ?? null;
    const multitracksPage = await findFirstMatchingPage(
      multitracksResults,
      (item) => item.includes('multitracks.com.br') || item.includes('multitracks.com'),
      (html, resultUrl) => ({
        url: resultUrl,
        description: parseMetaDescription(html),
      }),
      3000,
    );

    const payload: YoutubeMetadata = {
      title: inferred.title,
      artist: inferred.artist,
      durationSeconds:
        playerPayload?.lengthSeconds ??
        parseDurationSeconds(watchHtml) ??
        songBpmPage?.durationSeconds ??
        null,
      key:
        normalizeMusicalKey(
          extractKey(
            `${combinedText}\n${cifraPage?.description ?? ''}\n${multitracksPage?.description ?? ''}`,
          ),
        ) ||
        cifraPage?.key ||
        songBpmPage?.key ||
        undefined,
      bpm:
        extractBpm(
          `${combinedText}\n${cifraPage?.description ?? ''}\n${multitracksPage?.description ?? ''}`,
        ) ?? songBpmPage?.bpm,
      tags: mergeTags(
        baseTags,
        suggestTagsFromYoutubeText(cifraPage?.description ?? ''),
        suggestTagsFromYoutubeText(multitracksPage?.description ?? ''),
      ),
      cifraUrl: cifraPage?.url || undefined,
    };

    if (payload.durationSeconds || payload.key || payload.bpm) {
      const previous = youtubeMetadataCache.get(videoId);
      youtubeMetadataCache.set(videoId, {
        ...previous,
        ...payload,
        key: payload.key || previous?.key,
        bpm: payload.bpm ?? previous?.bpm ?? null,
        durationSeconds: payload.durationSeconds ?? previous?.durationSeconds ?? null,
        cifraUrl: payload.cifraUrl || previous?.cifraUrl,
        tags: payload.tags?.length ? payload.tags : previous?.tags,
      });
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        title: 'Nova música',
        artist: '',
        durationSeconds: null,
        key: '',
        bpm: null,
        tags: ['Culto'],
      } satisfies YoutubeMetadata,
    );
  }
}
