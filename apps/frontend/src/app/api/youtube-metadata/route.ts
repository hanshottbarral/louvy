import { NextRequest, NextResponse } from 'next/server';
import {
  extractBpm,
  extractKey,
  extractYoutubeVideoId,
  guessTitleAndArtist,
  suggestTagsFromYoutubeText,
  YoutubeMetadata,
} from '@/lib/youtube-metadata';
import { normalizeTagLabel } from '@/lib/utils';

export const runtime = 'nodejs';

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

async function fetchText(url: string, extraHeaders?: Record<string, string>) {
  const response = await fetch(url, {
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
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
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
  const key = keyMatch?.[1]?.trim() || '';

  return {
    bpm: Number.isFinite(bpm) ? bpm : null,
    durationSeconds,
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

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Envie um link do YouTube.' }, { status: 400 });
  }

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'Não consegui identificar o vídeo do YouTube.' }, { status: 400 });
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const [oembedResponse, watchResponse] = await Promise.all([
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
    ]);

    const oembed = oembedResponse.ok
      ? ((await oembedResponse.json()) as { title: string; author_name?: string })
      : null;
    const watchHtml = watchResponse.ok ? await watchResponse.text() : '';
    const descriptionMatch = watchHtml.match(/"shortDescription":"(.*?)"/);
    const description = decodeYoutubeText(descriptionMatch?.[1]);
    const rawTitle = oembed?.title || parseWatchTitle(watchHtml) || 'Nova música';
    const inferred = guessTitleAndArtist(rawTitle, oembed?.author_name);
    const combinedText = `${rawTitle}\n${description}`;
    const baseTags = suggestTagsFromYoutubeText(combinedText);

    const [cifraResults, songBpmResults, multitracksResults] = await Promise.all([
      searchDuckDuckGo(`${inferred.artist ?? ''} ${inferred.title} cifra club`),
      searchDuckDuckGo(`${inferred.artist ?? ''} ${inferred.title} site:songbpm.com`),
      searchDuckDuckGo(`${inferred.artist ?? ''} ${inferred.title} site:multitracks.com.br`),
    ]);

    const cifraUrl = cifraResults.find((item) => item.includes('cifraclub.com.br')) ?? '';
    const songBpmUrl = songBpmResults.find((item) => item.includes('songbpm.com')) ?? '';
    const multitracksUrl = multitracksResults.find((item) => item.includes('multitracks.com.br')) ?? '';

    const [cifraHtml, songBpmHtml, multitracksHtml] = await Promise.all([
      cifraUrl ? fetchText(cifraUrl).catch(() => '') : Promise.resolve(''),
      songBpmUrl ? fetchText(songBpmUrl).catch(() => '') : Promise.resolve(''),
      multitracksUrl ? fetchText(multitracksUrl).catch(() => '') : Promise.resolve(''),
    ]);

    const songBpmMetrics = songBpmHtml ? parseSongBpmMetrics(songBpmHtml) : { bpm: null, durationSeconds: null, key: '' };
    const cifraKey = cifraHtml ? parseCifraClubKey(cifraHtml) : '';
    const cifraDescription = cifraHtml ? parseMetaDescription(cifraHtml) : '';
    const multitracksDescription = multitracksHtml ? parseMetaDescription(multitracksHtml) : '';

    const payload: YoutubeMetadata = {
      title: inferred.title,
      artist: inferred.artist,
      durationSeconds:
        parseDurationSeconds(watchHtml) ??
        songBpmMetrics.durationSeconds ??
        null,
      key:
        extractKey(`${combinedText}\n${cifraDescription}\n${multitracksDescription}`) ||
        cifraKey ||
        songBpmMetrics.key ||
        undefined,
      bpm: extractBpm(`${combinedText}\n${cifraDescription}\n${multitracksDescription}`) ?? songBpmMetrics.bpm,
      tags: mergeTags(
        baseTags,
        suggestTagsFromYoutubeText(cifraDescription),
        suggestTagsFromYoutubeText(multitracksDescription),
      ),
      cifraUrl: cifraUrl || undefined,
    };

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
