'use client';

import {
  BellRing,
  BookAudio,
  Calendar,
  CalendarDays,
  ChevronRight,
  LogOut,
  MessageCircleHeart,
  Plus,
  Settings2,
  UserCircle2,
  Users2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ScheduleEventType } from '@korus/shared';
import { KorusMark } from '@/components/brand/korus-brand';
import { loadUserPreferences, USER_PREFERENCES_EVENT, UserPreferences } from '@/lib/user-preferences';
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
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const visibleSchedules = useMemo(
    () =>
      schedules.filter((schedule) =>
        schedule.members.some((member) => member.userId === currentUser?.id),
      ),
    [currentUser?.id, schedules],
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const sync = () => setPreferences(loadUserPreferences(currentUser.id));
    sync();

    const onPreferences = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; preferences: UserPreferences }>).detail;
      if (detail?.userId === currentUser.id) {
        setPreferences(detail.preferences);
      }
    };

    window.addEventListener(USER_PREFERENCES_EVENT, onPreferences);
    return () => {
      window.removeEventListener(USER_PREFERENCES_EVENT, onPreferences);
    };
  }, [currentUser]);

  const quickCreateSchedule = () => {
    const today = new Date().toISOString().slice(0, 10);
    void saveSchedule({
      title: 'Nova escala',
      date: today,
      time: '19:00',
      eventType: ScheduleEventType.SERVICE,
      eventLabel: 'Culto da noite',
      notes: 'Ajuste detalhes, equipe e repertório.',
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
    <aside className="flex min-h-[240px] flex-col rounded-[28px] bg-[linear-gradient(180deg,#121212_0%,#161922_100%)] p-3 text-[var(--sidebar-foreground)] lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <KorusMark tone="light" size={30} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">KORUS</p>
            <h1 className="mt-1 text-lg" data-display="true">Control hub</h1>
          </div>
        </div>
        {activeSection === 'schedules' || activeSection === 'repertoire' ? (
          <button
            onClick={contextualCreate}
            className="rounded-full border border-white/12 bg-white/5 p-2 text-white/90"
            title={activeSection === 'repertoire' ? 'Cadastrar música' : 'Criar escala'}
          >
            <Plus size={18} />
          </button>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <button
          onClick={() => setActiveSection('notices')}
          title="Avisos"
          aria-label="Avisos"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'notices' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <BellRing size={16} />
        </button>
        <button
          onClick={() => setActiveSection('schedules')}
          title="Escalas"
          aria-label="Escalas"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'schedules' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <Calendar size={16} />
        </button>
        <button
          onClick={() => setActiveSection('repertoire')}
          title="Repertório"
          aria-label="Repertório"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'repertoire' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <BookAudio size={16} />
        </button>
        <button
          onClick={() => setActiveSection('members')}
          title="Membros"
          aria-label="Membros"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'members' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <Users2 size={16} />
        </button>
        <button
          onClick={() => setActiveSection('calendar')}
          title="Calendário"
          aria-label="Calendário"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'calendar' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <CalendarDays size={16} />
        </button>
        <button
          onClick={() => setActiveSection('fellowship')}
          title="Comunhão"
          aria-label="Comunhão"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'fellowship' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <MessageCircleHeart size={16} />
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          title="Configurações"
          aria-label="Configurações"
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-3 text-sm',
            activeSection === 'settings' ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <Settings2 size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {visibleSchedules.map((schedule) => (
          <button
            key={schedule.id}
            onClick={() => {
              setActiveSection('schedules');
              selectSchedule(schedule.id);
            }}
            className={cn(
              'w-full rounded-2xl px-3 py-3 text-left transition',
              selectedScheduleId === schedule.id ? 'bg-[var(--surface)] text-[var(--foreground)]' : 'bg-white/5 hover:bg-white/10',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{schedule.title}</p>
                <p className="mt-1 text-xs opacity-70">
                  {getWeekdayLabel(schedule.date)} • {formatScheduleDate(schedule.date)}
                </p>
                <p className="mt-1 text-xs opacity-60">{schedule.time}</p>
              </div>
              <div className="flex items-center gap-2">
                {!!schedule.unreadCount && (
                  <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-xs text-[var(--foreground)]">
                    {schedule.unreadCount}
                  </span>
                )}
                <ChevronRight size={16} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/6 p-3 shadow-[0_10px_20px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3">
          {preferences?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preferences.avatarUrl}
              alt={preferences.displayName ?? currentUser?.name ?? 'Perfil'}
              className="h-[34px] w-[34px] rounded-full object-cover"
            />
          ) : (
            <UserCircle2 size={34} />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{preferences?.displayName ?? currentUser?.name}</p>
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
