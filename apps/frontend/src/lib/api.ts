import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function uploadAudio(file: Blob) {
  const extension =
    file.type.includes('mp4') || file.type.includes('m4a')
      ? 'm4a'
      : file.type.includes('mpeg')
        ? 'mp3'
        : file.type.includes('wav')
          ? 'wav'
          : 'webm';
  const filePath = `${crypto.randomUUID()}/voice-note-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('chat-audio').upload(filePath, file, {
    contentType: file.type || 'audio/webm',
    upsert: false,
  });

  if (error) {
    throw new Error(
      'Nao consegui enviar o audio para o armazenamento. Confira o bucket chat-audio e as policies do Supabase.',
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('chat-audio').getPublicUrl(filePath);

  return {
    url: publicUrl,
    storage: 'remote' as const,
  };
}

export async function sendNotificationEmail(payload: {
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch('/api/notification-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Nao consegui disparar o email desta notificacao.');
  }

  return response.json();
}
