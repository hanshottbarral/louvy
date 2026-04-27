'use client';

import { MessageType } from '@louvy/shared';
import { supabase } from '@/lib/supabase';
import { SessionUser } from '@/types';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  linkUrl?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  createdByName: string;
}

export interface FellowshipMessage {
  id: string;
  content?: string | null;
  type: MessageType;
  audioUrl?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

const NOTICES_KEY = 'louvy:notices:v1';
const FELLOWSHIP_KEY = 'louvy:fellowship:v1';

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasBrowserStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.toLowerCase().includes('relation') ||
    message.toLowerCase().includes('does not exist')
  );
}

export async function loadNotices() {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, link_url, image_url, created_at, created_by')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return readJson<NoticeItem[]>(NOTICES_KEY, []);
    }

    throw error;
  }

  const profileIds = Array.from(new Set((data ?? []).map((row) => row.created_by).filter(Boolean)));
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from('profiles').select('id, name').in('id', profileIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));

  const notices = (data ?? []).map<NoticeItem>((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    linkUrl: row.link_url,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    createdByName: profileMap.get(row.created_by) ?? 'Liderança',
  }));

  writeJson(NOTICES_KEY, notices);
  return notices;
}

export async function saveNotice(
  currentUser: SessionUser,
  payload: Pick<NoticeItem, 'title' | 'content' | 'linkUrl' | 'imageUrl'>,
) {
  const localNotice: NoticeItem = {
    id: crypto.randomUUID(),
    title: payload.title.trim(),
    content: payload.content.trim(),
    linkUrl: payload.linkUrl?.trim() || null,
    imageUrl: payload.imageUrl?.trim() || null,
    createdAt: new Date().toISOString(),
    createdByName: currentUser.name,
  };

  const localNotices = [localNotice, ...readJson<NoticeItem[]>(NOTICES_KEY, [])];
  writeJson(NOTICES_KEY, localNotices);

  const { error } = await supabase.from('announcements').insert({
    id: localNotice.id,
    title: localNotice.title,
    content: localNotice.content,
    link_url: localNotice.linkUrl,
    image_url: localNotice.imageUrl,
    created_by: currentUser.id,
  });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return loadNotices();
}

export async function loadFellowshipMessages() {
  const { data, error } = await supabase
    .from('fellowship_messages')
    .select('id, user_id, content, type, audio_url, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return readJson<FellowshipMessage[]>(FELLOWSHIP_KEY, []);
    }

    throw error;
  }

  const profileIds = Array.from(new Set((data ?? []).map((row) => row.user_id)));
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from('profiles').select('id, name').in('id', profileIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));

  const messages = (data ?? []).map<FellowshipMessage>((row) => ({
    id: row.id,
    content: row.content,
    type: row.type,
    audioUrl: row.audio_url,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      name: profileMap.get(row.user_id) ?? 'Integrante',
    },
  }));

  writeJson(FELLOWSHIP_KEY, messages);
  return messages;
}

export async function saveFellowshipMessage(
  currentUser: SessionUser,
  payload: Pick<FellowshipMessage, 'type' | 'content' | 'audioUrl'>,
) {
  const localMessage: FellowshipMessage = {
    id: crypto.randomUUID(),
    content: payload.content ?? null,
    type: payload.type,
    audioUrl: payload.audioUrl ?? null,
    createdAt: new Date().toISOString(),
    user: {
      id: currentUser.id,
      name: currentUser.name,
    },
  };

  const localMessages = [...readJson<FellowshipMessage[]>(FELLOWSHIP_KEY, []), localMessage];
  writeJson(FELLOWSHIP_KEY, localMessages);

  const { error } = await supabase.from('fellowship_messages').insert({
    id: localMessage.id,
    user_id: currentUser.id,
    content: localMessage.content,
    type: localMessage.type,
    audio_url: localMessage.audioUrl,
  });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return loadFellowshipMessages();
}
