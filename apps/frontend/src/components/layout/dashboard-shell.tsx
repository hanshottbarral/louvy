'use client';

import { Bell, CalendarClock, Music2, UserRound } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { ChatPanel } from '@/components/chat/chat-panel';
import { RepertoirePanel } from '@/components/songs/repertoire-panel';
import { Sidebar } from '@/components/layout/sidebar';
import { ScheduleEditorPanel } from '@/components/schedules/schedule-editor-panel';
import { MembersPanel } from '@/components/schedules/members-panel';
import { ScheduleHeader } from '@/components/schedules/schedule-header';
import { SetlistPanel } from '@/components/songs/setlist-panel';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useAppStore } from '@/store/use-app-store';

export function DashboardShell() {
  useSocketEvents();
  const activeSection = useAppStore((state) => state.activeSection);
  const currentUser = useAppStore((state) => state.currentUser);
  const initialized = useAppStore((state) => state.initialized);
  const isLoading = useAppStore((state) => state.isLoading);
  const isHydratingApp = useAppStore((state) => state.isHydratingApp);
  const selectedScheduleId = useAppStore((state) => state.selectedScheduleId);
  const schedule = useAppStore((state) =>
    state.schedules.find((item) => item.id === selectedScheduleId),
  );
  const notifications = useAppStore((state) => state.notifications);

  if (!initialized || isLoading) {
    return <main className="p-6">Carregando ambiente...</main>;
  }

  if (!currentUser) {
    return <AuthPanel />;
  }

  if (isHydratingApp && !schedule && activeSection === 'schedules') {
    return <main className="p-6">Entrou. Agora estou carregando suas escalas...</main>;
  }

  if (!schedule && activeSection === 'schedules') {
    return <main className="p-6">Nenhuma escala selecionada.</main>;
  }

  return (
    <main className="min-h-screen p-3 md:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar />
        <section className="glass overflow-hidden rounded-[28px]">
          {activeSection === 'repertoire' ? (
            <div className="p-3">
              <RepertoirePanel />
            </div>
          ) : schedule ? (
            <>
              <div className="border-b border-[var(--line)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <ScheduleHeader schedule={schedule} />
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <Bell size={16} /> {notifications.length}
                    </span>
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <CalendarClock size={16} /> {schedule.time}
                    </span>
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <Music2 size={16} /> {schedule.songs.length} musicas
                    </span>
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <UserRound size={16} /> {schedule.memberCount} membros
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-3 xl:grid-cols-[360px_minmax(0,1fr)_390px]">
                <div className="space-y-3">
                  <ScheduleEditorPanel schedule={schedule} />
                  <MembersPanel schedule={schedule} />
                </div>
                <SetlistPanel schedule={schedule} />
                <ChatPanel schedule={schedule} />
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
