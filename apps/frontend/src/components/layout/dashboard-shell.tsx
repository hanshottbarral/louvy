'use client';

import { AppRole, ScheduleEventType } from '@korus/shared';
import { Bell, CalendarClock, Music2, Save, Trash2, UserRound } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { CalendarPanel } from '@/components/calendar/calendar-panel';
import { ChatPanel } from '@/components/chat/chat-panel';
import { FellowshipPanel } from '@/components/fellowship/fellowship-panel';
import { MemberDirectoryPanel } from '@/components/members/member-directory-panel';
import { NoticesPanel } from '@/components/notices/notices-panel';
import { SettingsPanel } from '@/components/settings/settings-panel';
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
  const deleteSchedule = useAppStore((state) => state.deleteSchedule);
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
      notes: 'Comece ajustando equipe, repertório e observações.',
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
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Sidebar />
        <section className="glass overflow-hidden rounded-[30px] lg:h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
          {activeSection === 'repertoire' ? (
            <div className="p-3">
              <RepertoirePanel />
            </div>
          ) : activeSection === 'notices' ? (
            <div className="p-3">
              <NoticesPanel />
            </div>
          ) : activeSection === 'members' ? (
            <div className="p-3">
              <MemberDirectoryPanel />
            </div>
          ) : activeSection === 'calendar' ? (
            <div className="p-3">
              <CalendarPanel />
            </div>
          ) : activeSection === 'fellowship' ? (
            <div className="p-3">
              <FellowshipPanel />
            </div>
          ) : activeSection === 'settings' ? (
            <div className="p-3">
              <SettingsPanel />
            </div>
          ) : isHydratingApp && !schedule ? (
            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Escalas</p>
              <h2 className="mt-2 text-2xl">Entrou. Agora estou carregando suas escalas...</h2>
              <div className="mt-6 grid gap-3 xl:grid-cols-[300px_minmax(0,1.2fr)_430px]">
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
                Assim que a primeira escala existir, ela aparece aqui com equipe, repertório e chat.
              </p>
              {authMessage ? (
                <p className="mt-4 rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
                  Sua conta está como músico no banco. Depois de aplicar o patch de membros no Supabase, marque seu perfil como admin para liberar a criação da primeira escala.
                </p>
              )}
            </div>
          ) : schedule ? (
            <>
              <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color:rgba(245,245,245,0.94)] px-5 py-4 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <ScheduleHeader schedule={schedule} />
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    {currentUser.role === AppRole.ADMIN ? (
                      <>
                        <button
                          type="submit"
                          form={`schedule-editor-form-${schedule.id}`}
                          className="glass rounded-full p-2 text-[var(--foreground)]"
                          title="Salvar escala agora"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSchedule(schedule.id)}
                          className="glass rounded-full p-2 text-[var(--danger)]"
                          title="Excluir escala"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : null}
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <Bell size={16} /> {notifications.length}
                    </span>
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <CalendarClock size={16} /> {schedule.time}
                    </span>
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <Music2 size={16} /> {schedule.songs.length} músicas
                    </span>
                    <span className="glass flex items-center gap-2 rounded-full px-3 py-2">
                      <UserRound size={16} /> {schedule.memberCount} membros
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-3 xl:grid-cols-[300px_minmax(0,1.2fr)_430px]">
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
