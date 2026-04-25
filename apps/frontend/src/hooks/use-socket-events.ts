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
    } = supabase.auth.onAuthStateChange(() => {
      void bootstrap();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [bootstrap]);

  useEffect(() => {
    if (!initialized || !currentUser) {
      return;
    }

    const schedulesChannel = supabase
      .channel(`db:schedules:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => void refreshData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_members' },
        () => void refreshData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_songs' },
        () => void refreshData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => void refreshData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => void refreshData(),
      )
      .subscribe();

    return () => {
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
