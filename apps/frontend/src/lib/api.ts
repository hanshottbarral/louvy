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
  try {
    const filePath = `${crypto.randomUUID()}/voice-note-${Date.now()}.webm`;
    const { error } = await supabase.storage.from('chat-audio').upload(filePath, file, {
      contentType: file.type || 'audio/webm',
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-audio').getPublicUrl(filePath);

    return {
      url: publicUrl,
      storage: 'remote' as const,
    };
  } catch {
    return {
      url: URL.createObjectURL(file),
      storage: 'local' as const,
    };
  }
}
