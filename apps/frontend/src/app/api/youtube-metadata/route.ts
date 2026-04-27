import { NextRequest, NextResponse } from 'next/server';
import {
  extractBpm,
  extractKey,
  extractYoutubeVideoId,
  guessTitleAndArtist,
  suggestTagsFromYoutubeText,
  YoutubeMetadata,
} from '@/lib/youtube-metadata';

export const runtime = 'nodejs';

function parseDurationSeconds(pageHtml: string) {
  const jsonLdDurationMatch = pageHtml.match(/"duration":"PT(?:(\d+)M)?(?:(\d+)S)?"/i);
  if (jsonLdDurationMatch) {
    const minutes = Number(jsonLdDurationMatch[1] ?? 0);
    const seconds = Number(jsonLdDurationMatch[2] ?? 0);
    return minutes * 60 + seconds;
  }

  const lengthSecondsMatch = pageHtml.match(/"lengthSeconds":"(\d+)"/);
  return lengthSecondsMatch ? Number(lengthSecondsMatch[1]) : null;
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

    if (!oembedResponse.ok) {
      return NextResponse.json(
        { error: 'Não consegui buscar os dados principais desse vídeo agora.' },
        { status: 400 },
      );
    }

    const oembed = (await oembedResponse.json()) as { title: string; author_name?: string };
    const watchHtml = watchResponse.ok ? await watchResponse.text() : '';
    const descriptionMatch = watchHtml.match(/"shortDescription":"(.*?)"/);
    const description = decodeYoutubeText(descriptionMatch?.[1]);
    const durationSeconds = parseDurationSeconds(watchHtml);
    const inferred = guessTitleAndArtist(oembed.title, oembed.author_name);
    const combinedText = `${oembed.title}\n${description}`;

    const payload: YoutubeMetadata = {
      title: inferred.title,
      artist: inferred.artist,
      durationSeconds,
      key: extractKey(combinedText) || undefined,
      bpm: extractBpm(combinedText),
      tags: suggestTagsFromYoutubeText(combinedText),
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: 'Não consegui consultar o YouTube agora. Tente novamente em instantes.' },
      { status: 500 },
    );
  }
}
