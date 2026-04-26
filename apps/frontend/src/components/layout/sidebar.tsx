'use client';

import { BookAudio, Calendar, ChevronRight, LogOut, Plus, UserCircle2 } from 'lucide-react';
import { ScheduleEventType } from '@louvy/shared';
import { formatScheduleDate, getWeekdayLabel } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const activeSection = useAppStore((state) => state.activeSection);
  const schedules = useAppStore((state) => state.schedules);
  const selectedScheduleId = useAppStore((state) => state.selectedScheduleId);
  const selectSchedule = useAppStore((state) => state.selectSchedule);
  const setActiveSection = useAppStore((state) => state.setActiveSection);
  const saveSchedule = useAppStore((state) => state.saveSchedule);
  const openRepertoireComposer = useAppStore((state) => state.openRepertoireComposer);
  const signOut = useAppStore((state) => state.signOut);
  const currentUser = useAppStore((state) => state.currentUser);

  const quickCreateSchedule = () => {
    const today = new Date().toISOString().slice(0, 10);
    void saveSchedule({
      title: 'Nova escala',
      date: today,
      time: '19:00',
      eventType: ScheduleEventType.SERVICE,
      eventLabel: 'Culto da noite',
      notes: 'Ajuste detalhes, equipe e repertorio.',
    });
  };

  const contextualCreate = () => {
    if (activeSection === 'repertoire') {
      openRepertoireComposer();
      return;
    }

    quickCreateSchedule();
  };

  return (
    <aside className="flex min-h-[240px] flex-col rounded-[28px] bg-[var(--sidebar)] p-4 text-[var(--sidebar-foreground)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Louvy</p>
          <h1 className="mt-1 text-2xl">Ministerio</h1>
        </div>
        <button
          onClick={contextualCreate}
          className="rounded-full border border-white/12 p-2 text-white/90"
          title={activeSection === 'repertoire' ? 'Cadastrar musica' : 'Criar escala'}
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveSection('schedules')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm',
            activeSection === 'schedules' ? 'bg-white text-[var(--foreground)]' : 'bg-white/5',
          )}
        >
          <Calendar size={16} /> Escalas
        </button>
        <button
          onClick={() => setActiveSection('repertoire')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm',
            activeSection === 'repertoire' ? 'bg-white text-[var(--foreground)]' : 'bg-white/5',
          )}
        >
          <BookAudio size={16} /> Repertorio
        </button>
      </div>

      <div className="space-y-2">
        {schedules.map((schedule) => (
          <button
            key={schedule.id}
            onClick={() => {
              setActiveSection('schedules');
              selectSchedule(schedule.id);
            }}
            className={cn(
              'w-full rounded-2xl px-3 py-3 text-left transition',
              selectedScheduleId === schedule.id ? 'bg-white text-[var(--foreground)]' : 'bg-white/5',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{schedule.title}</p>
                <p className="mt-1 text-xs opacity-70">
                  {getWeekdayLabel(schedule.date)} • {formatScheduleDate(schedule.date)}
                </p>
                <p className="mt-1 text-xs opacity-60">{schedule.eventLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {!!schedule.unreadCount && (
                  <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-xs text-white">
                    {schedule.unreadCount}
                  </span>
                )}
                <ChevronRight size={16} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center gap-3">
          <UserCircle2 size={34} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{currentUser?.name}</p>
            <p className="truncate text-xs text-white/60">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-sm"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
