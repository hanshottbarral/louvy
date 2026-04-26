'use client';

import { AppRole, ScheduleEventType } from '@louvy/shared';
import { Bell, CalendarClock, Music2, UserRound } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { CalendarPanel } from '@/components/calendar/calendar-panel';
import { ChatPanel } from '@/components/chat/chat-panel';
import { MemberDirectoryPanel } from '@/components/members/member-directory-panel';
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
  const saveSchedule = useAppStore((state) => state.saveSchedule);
  const authMessage = useAppStore((state) => state.authMessage);
  const schedule = useAppStore((state) =>
    state.schedules.find((item) => item.id === selectedScheduleId),
  );
  const notifications = useAppStore((state) => state.notifications);

  const createFirstSchedule = () => {
    const today = new Date().toISOString().slice(0, 10);
    void saveSchedule({
      title: 'Primeira escala',
      date: today,
      time: '19:00',
      eventType: ScheduleEventType.SERVICE,
      eventLabel: 'Culto da noite',
      notes: 'Comece ajustando equipe, repertorio e observacoes.',
    });
  };

  if (!initialized || isLoading) {
    return <main className="p-6">Carregando ambiente...</main>;
  }

  if (!currentUser) {
    return <AuthPanel />;
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
          ) : activeSection === 'members' ? (
            <div className="p-3">
              <MemberDirectoryPanel />
            </div>
          ) : activeSection === 'calendar' ? (
            <div className="p-3">
              <CalendarPanel />
            </div>
          ) : isHydratingApp && !schedule ? (
            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Escalas</p>
              <h2 className="mt-2 text-2xl">Entrou. Agora estou carregando suas escalas...</h2>
              <div className="mt-6 grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)_390px]">
                <div className="glass min-h-[220px] rounded-3xl p-4 opacity-60" />
                <div className="glass min-h-[420px] rounded-3xl p-4 opacity-60" />
                <div className="glass min-h-[420px] rounded-3xl p-4 opacity-60" />
              </div>
            </div>
          ) : !schedule ? (
            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Escalas</p>
              <h2 className="mt-2 text-2xl">Nenhuma escala criada ainda.</h2>
              <p className="mt-2 max-w-[640px] text-sm text-[var(--muted)]">
                Assim que a primeira escala existir, ela aparece aqui com equipe, repertorio e chat.
              </p>
              {authMessage ? (
                <p className="mt-4 rounded-2xl bg-[rgba(31,122,92,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                  {authMessage}
                </p>
              ) : null}
              {currentUser.role === AppRole.ADMIN ? (
                <button
                  type="button"
                  onClick={createFirstSchedule}
                  className="mt-6 rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white"
                >
                  Criar primeira escala
                </button>
              ) : (
                <p className="mt-6 text-sm text-[var(--muted)]">
                  Sua conta esta como musico no banco. Depois de aplicar o patch de membros no Supabase, marque seu perfil como admin para liberar a criacao da primeira escala.
                </p>
              )}
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
