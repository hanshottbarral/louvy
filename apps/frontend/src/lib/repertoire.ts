'use client';

import { supabase } from '@/lib/supabase';
import { MinistrySongView, RepertoireSongInput } from '@/types';

interface RepertoireSongRow {
  id: string;
  name: string;
  artist?: string | null;
  musical_key: string;
  bpm: number | null;
  duration_seconds?: number | null;
  youtube_url: string | null;
  category: string;
  tags: string[] | null;
  created_at: string;
}

function isSchemaMismatch(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return code === 'PGRST204' || code === '42703' || message.toLowerCase().includes('column');
}

export async function fetchRepertoireLibrary() {
  const extendedSelect =
    'id, name, artist, musical_key, bpm, duration_seconds, youtube_url, category, tags, created_at';
  const baseSelect = 'id, name, musical_key, bpm, youtube_url, category, tags, created_at';

  let rows: RepertoireSongRow[] = [];

  const extendedResult = await supabase
    .from('repertoire_songs')
    .select(extendedSelect)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (extendedResult.error) {
    if (!isSchemaMismatch(extendedResult.error)) {
      throw extendedResult.error;
    }

    const baseResult = await supabase
      .from('repertoire_songs')
      .select(baseSelect)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (baseResult.error) {
      throw baseResult.error;
    }

    rows = (baseResult.data ?? []) as RepertoireSongRow[];
  } else {
    rows = (extendedResult.data ?? []) as RepertoireSongRow[];
  }

  return rows.map<MinistrySongView>((song, index) => ({
    id: song.id,
    name: song.name,
    artist: song.artist ?? undefined,
    key: song.musical_key,
    bpm: song.bpm,
    durationSeconds: song.duration_seconds ?? null,
    youtubeUrl: song.youtube_url,
    position: index,
    category: song.category,
    lastPlayed: song.created_at.slice(0, 10),
    tags: song.tags ?? [],
  }));
}

export async function insertRepertoireSong(payload: RepertoireSongInput, createdBy: string) {
  const extendedBody = {
    name: payload.name.trim(),
    artist: payload.artist?.trim() ? payload.artist.trim() : null,
    musical_key: payload.key.trim(),
    bpm: payload.bpm ?? null,
    duration_seconds: payload.durationSeconds ?? null,
    youtube_url: payload.youtubeUrl?.trim() ? payload.youtubeUrl.trim() : null,
    category: payload.category.trim(),
    tags: payload.tags,
    created_by: createdBy,
    is_active: true,
  };

  if (payload.id) {
    const { error } = await supabase.from('repertoire_songs').update(extendedBody).eq('id', payload.id);
    if (!error) {
      return {
        id: payload.id,
        usedLegacyFallback: false,
      };
    }

    if (!isSchemaMismatch(error)) {
      throw error;
    }

    const legacyUpdate = await supabase
      .from('repertoire_songs')
      .update({
        name: extendedBody.name,
        musical_key: extendedBody.musical_key,
        bpm: extendedBody.bpm,
        youtube_url: extendedBody.youtube_url,
        category: extendedBody.category,
        tags: extendedBody.tags,
      })
      .eq('id', payload.id);

    if (legacyUpdate.error) {
      throw legacyUpdate.error;
    }

    return {
      id: payload.id,
      usedLegacyFallback: true,
    };
  }

  const extendedResult = await supabase
    .from('repertoire_songs')
    .insert(extendedBody)
    .select('id')
    .single();

  if (!extendedResult.error) {
    return {
      id: extendedResult.data.id,
      usedLegacyFallback: false,
    };
  }

  if (!isSchemaMismatch(extendedResult.error)) {
    throw extendedResult.error;
  }

  const baseResult = await supabase
    .from('repertoire_songs')
    .insert({
      name: extendedBody.name,
      musical_key: extendedBody.musical_key,
      bpm: extendedBody.bpm,
      youtube_url: extendedBody.youtube_url,
      category: extendedBody.category,
      tags: extendedBody.tags,
      created_by: createdBy,
      is_active: true,
    })
    .select('id')
    .single();

  if (baseResult.error) {
    throw baseResult.error;
  }

  return {
    id: baseResult.data.id,
    usedLegacyFallback: true,
  };
}
