'use client';

import { useEffect } from 'react';
import { subscribeToTyping } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/use-app-store';

export function useSocketEvents() {
  const initialized = useAppStore((state) => state.initialized);
  const currentUser = useAppStore((state) => state.currentUser);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const refreshData = useAppStore((state) => state.refreshData);
  const selectedScheduleId = useAppStore((state) => state.selectedScheduleId);
  const markTyping = useAppStore((state) => state.markTyping);

  useEffect(() => {
    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void bootstrap();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [bootstrap]);

  useEffect(() => {
    if (!initialized || !currentUser) {
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    const queueRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        void refreshData();
      }, 250);
    };

    const schedulesChannel = supabase
      .channel(`db:schedules:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_members', filter: `user_id=eq.${currentUser.id}` },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_songs' },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        queueRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const next = payload.new as { title?: string; body?: string };
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(next.title ?? 'Nova notificacao', {
              body: next.body ?? 'Voce recebeu uma atualizacao no Louvy.',
            });
          }
          queueRefresh();
        },
      )
      .subscribe();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      void supabase.removeChannel(schedulesChannel);
    };
  }, [currentUser, initialized, refreshData]);

  useEffect(() => {
    if (!selectedScheduleId) {
      return;
    }

    const unsubscribe = subscribeToTyping(selectedScheduleId, (payload) => {
      if (payload.scheduleId === selectedScheduleId && payload.userName !== currentUser?.name) {
        markTyping(payload.userName);
        window.setTimeout(() => markTyping(undefined), 1800);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.name, markTyping, selectedScheduleId]);
}
