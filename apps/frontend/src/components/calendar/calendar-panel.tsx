'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppRole } from '@louvy/shared';
import { CalendarDays, Clock3, LockKeyhole, RefreshCw } from 'lucide-react';
import {
  availabilityRecurrenceLabel,
  availabilityTimeSlotLabel,
  scheduleEventTypeLabel,
} from '@/lib/labels';
import { formatScheduleDate, getWeekdayLabel } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { AvailabilityRecurrence, AvailabilityTimeSlot } from '@/types';

const recurrenceOptions: AvailabilityRecurrence[] = [
  'NONE',
  'WEEKLY',
  'FIRST_SUNDAY_MONTHLY',
  'SUNDAY_MORNING_WEEKLY',
  'SUNDAY_NIGHT_WEEKLY',
];

const timeSlotOptions: AvailabilityTimeSlot[] = ['ANY', 'MORNING', 'AFTERNOON', 'NIGHT'];

export function CalendarPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const schedules = useAppStore((state) => state.schedules);
  const authMessage = useAppStore((state) => state.authMessage);
  const availabilityBlocks = useAppStore((state) => state.availabilityBlocks);
  const isLoadingCalendar = useAppStore((state) => state.isLoadingCalendar);
  const loadAvailabilityBlocks = useAppStore((state) => state.loadAvailabilityBlocks);
  const saveAvailabilityBlock = useAppStore((state) => state.saveAvailabilityBlock);
  const removeAvailabilityBlock = useAppStore((state) => state.removeAvailabilityBlock);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [timeSlot, setTimeSlot] = useState<AvailabilityTimeSlot>('ANY');
  const [recurrence, setRecurrence] = useState<AvailabilityRecurrence>('NONE');

  useEffect(() => {
    void loadAvailabilityBlocks();
  }, [loadAvailabilityBlocks]);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.date >= today),
    [schedules, today],
  );

  const visibleBlocks = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (currentUser.role === AppRole.ADMIN) {
      return availabilityBlocks;
    }

    return availabilityBlocks.filter((block) => block.userId === currentUser.id);
  }, [availabilityBlocks, currentUser]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!date || !reason.trim()) {
      return;
    }

    await saveAvailabilityBlock({
      date,
      reason,
      timeSlot,
      recurrence,
    });

    setDate('');
    setReason('');
    setTimeSlot('ANY');
    setRecurrence('NONE');
  };

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-3">
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Planejamento</p>
          <h2 className="mt-2 text-3xl leading-none">Calendario ministerial</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Veja as proximas escalas, acompanhe datas importantes e registre indisponibilidades antes da montagem de cada equipe.
          </p>
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Proximas escalas</p>
              <h3 className="text-xl">{upcomingSchedules.length} eventos futuros</h3>
            </div>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
              Agenda viva
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {upcomingSchedules.length ? (
              upcomingSchedules.map((schedule) => (
                <article
                  key={schedule.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{schedule.title}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {scheduleEventTypeLabel[schedule.eventType]} • {schedule.eventLabel}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm">
                      {schedule.memberCount} membros
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                    <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2">
                      <CalendarDays size={16} /> {getWeekdayLabel(schedule.date)} • {formatScheduleDate(schedule.date)}
                    </span>
                    <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2">
                      <Clock3 size={16} /> {schedule.time}
                    </span>
                  </div>
                  {schedule.notes ? (
                    <p className="mt-3 text-sm text-[var(--muted)]">{schedule.notes}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-6 text-sm text-[var(--muted)]">
                Ainda nao existem escalas futuras cadastradas. Assim que voce ou outro admin criar eventos, eles aparecem aqui.
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center gap-2">
            <LockKeyhole size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Minha agenda</p>
              <h3 className="text-xl">Indisponibilidades</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            />
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo: viagem, trabalho, consulta, descanso vocal, etc."
              className="min-h-[110px] w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            />
            <div className="grid gap-3">
              <select
                value={timeSlot}
                onChange={(event) => setTimeSlot(event.target.value as AvailabilityTimeSlot)}
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              >
                {timeSlotOptions.map((option) => (
                  <option key={option} value={option}>
                    {availabilityTimeSlotLabel[option]}
                  </option>
                ))}
              </select>
              <select
                value={recurrence}
                onChange={(event) => setRecurrence(event.target.value as AvailabilityRecurrence)}
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              >
                {recurrenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {availabilityRecurrenceLabel[option]}
                  </option>
                ))}
              </select>
            </div>

            {authMessage ? (
              <div className="rounded-2xl bg-[rgba(31,122,92,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                {authMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoadingCalendar}
              className="w-full rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white disabled:opacity-60"
            >
              {isLoadingCalendar ? 'Salvando...' : 'Bloquear data'}
            </button>
          </form>
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Bloqueios</p>
              <h3 className="text-xl">{visibleBlocks.length} registros</h3>
            </div>
            <button
              type="button"
              onClick={() => void loadAvailabilityBlocks({ force: true })}
              className="rounded-full border border-[var(--line)] p-2"
              title="Atualizar lista"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {visibleBlocks.length ? (
              visibleBlocks.map((block) => (
                <article
                  key={block.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatScheduleDate(block.date)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {currentUser?.role === AppRole.ADMIN ? `${block.userName} • ` : ''}
                        {availabilityTimeSlotLabel[block.timeSlot]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeAvailabilityBlock(block.id)}
                      className="rounded-full border border-[var(--line)] px-3 py-1 text-xs"
                    >
                      Remover
                    </button>
                  </div>

                  <p className="mt-3 text-sm">{block.reason}</p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {availabilityRecurrenceLabel[block.recurrence]}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--muted)]">
                Nenhuma indisponibilidade registrada ainda.
              </div>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
