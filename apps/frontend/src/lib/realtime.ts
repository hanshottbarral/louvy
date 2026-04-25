'use client';

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

let typingChannel: RealtimeChannel | null = null;
let currentScheduleId = '';

export function subscribeToTyping(
  scheduleId: string,
  onTyping: (payload: { userName: string; scheduleId: string }) => void,
) {
  if (typingChannel && currentScheduleId !== scheduleId) {
    void supabase.removeChannel(typingChannel);
    typingChannel = null;
  }

  currentScheduleId = scheduleId;
  if (!scheduleId) {
    return () => undefined;
  }

  if (!typingChannel) {
    typingChannel = supabase.channel(`typing:${scheduleId}`);
    typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      onTyping(payload as { userName: string; scheduleId: string });
    });
    void typingChannel.subscribe();
  }

  return () => undefined;
}

export async function broadcastTyping(payload: { userName: string; scheduleId: string }) {
  if (!typingChannel || currentScheduleId !== payload.scheduleId) {
    typingChannel = supabase.channel(`typing:${payload.scheduleId}`);
    currentScheduleId = payload.scheduleId;
    await typingChannel.subscribe();
  }

  await typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload,
  });
}

