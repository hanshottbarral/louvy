'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppRole, ScheduleEventType } from '@louvy/shared';
import { CalendarDays, Clock3, LockKeyhole, PlusCircle, RefreshCw } from 'lucide-react';
import { availabilityRecurrenceLabel, availabilityTimeSlotLabel } from '@/lib/labels';
import { formatScheduleDate, getWeekdayLabel } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { AvailabilityRecurrence, AvailabilityTimeSlot } from '@/types';

const recurrenceOptions: AvailabilityRecurrence[] = [
  'NONE',
  'WEEKLY',
  'FIRST_SUNDAY_MONTHLY',
  'MONTHLY_BY_DAY',
  'BIWEEKLY',
];

const timeSlotOptions: AvailabilityTimeSlot[] = ['ANY', 'MORNING', 'AFTERNOON', 'NIGHT'];
const weekdayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getMonthGrid(anchorDate: Date) {
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - end.getDay()));

  const days: Date[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function CalendarPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const schedules = useAppStore((state) => state.schedules);
  const authMessage = useAppStore((state) => state.authMessage);
  const availabilityBlocks = useAppStore((state) => state.availabilityBlocks);
  const isLoadingCalendar = useAppStore((state) => state.isLoadingCalendar);
  const loadAvailabilityBlocks = useAppStore((state) => state.loadAvailabilityBlocks);
  const saveAvailabilityBlock = useAppStore((state) => state.saveAvailabilityBlock);
  const removeAvailabilityBlock = useAppStore((state) => state.removeAvailabilityBlock);
  const saveSchedule = useAppStore((state) => state.saveSchedule);
  const selectSchedule = useAppStore((state) => state.selectSchedule);
  const setActiveSection = useAppStore((state) => state.setActiveSection);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [timeSlot, setTimeSlot] = useState<AvailabilityTimeSlot>('ANY');
  const [recurrence, setRecurrence] = useState<AvailabilityRecurrence>('NONE');

  useEffect(() => {
    void loadAvailabilityBlocks();
  }, [loadAvailabilityBlocks]);

  const days = useMemo(() => getMonthGrid(monthAnchor), [monthAnchor]);
  const scheduleMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const schedule of schedules) {
      map.set(schedule.date, (map.get(schedule.date) ?? 0) + 1);
    }
    return map;
  }, [schedules]);

  const blockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const block of availabilityBlocks) {
      if (currentUser?.role === AppRole.ADMIN || block.userId === currentUser?.id) {
        map.set(block.date, (map.get(block.date) ?? 0) + 1);
      }
    }
    return map;
  }, [availabilityBlocks, currentUser]);

  const selectedSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.date === selectedDate),
    [schedules, selectedDate],
  );

  const visibleBlocks = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return availabilityBlocks.filter(
      (block) =>
        block.date === selectedDate &&
        (currentUser.role === AppRole.ADMIN || block.userId === currentUser.id),
    );
  }, [availabilityBlocks, currentUser, selectedDate]);

  const selectedDateLabel = useMemo(
    () => `${getWeekdayLabel(selectedDate)} • ${formatScheduleDate(selectedDate)}`,
    [selectedDate],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDate || !reason.trim()) {
      return;
    }

    await saveAvailabilityBlock({
      date: selectedDate,
      reason,
      timeSlot,
      recurrence,
    });

    setReason('');
    setTimeSlot('ANY');
    setRecurrence('NONE');
  };

  const createScheduleOnSelectedDay = async () => {
    const scheduleId = await saveSchedule({
      title: 'Nova escala',
      date: selectedDate,
      time: '19:00',
      eventType: ScheduleEventType.SERVICE,
      eventLabel: 'Escala',
      notes: '',
    });

    if (scheduleId) {
      setActiveSection('schedules');
      selectSchedule(scheduleId);
    }
  };

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_410px]">
      <div className="space-y-3">
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Planejamento</p>
          <h2 className="mt-2 text-3xl leading-none">Calendário ministerial</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Clique em qualquer dia para registrar indisponibilidade ou criar uma escala. A ideia aqui é ficar mais próximo de uma agenda viva do ministério.
          </p>
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Mês</p>
              <h3 className="text-2xl">
                {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(monthAnchor)}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
              >
                Próximo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {weekdayHeaders.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dayKey = toDateKey(day);
              const isSelected = dayKey === selectedDate;
              const isCurrentMonth = day.getMonth() === monthAnchor.getMonth();
              const scheduleCount = scheduleMap.get(dayKey) ?? 0;
              const blockCount = blockMap.get(dayKey) ?? 0;

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setSelectedDate(dayKey)}
                  className={`min-h-[108px] rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[rgba(122,31,62,0.08)]'
                      : 'border-[var(--line)] bg-[var(--surface-strong)]'
                  } ${!isCurrentMonth ? 'opacity-45' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{day.getDate()}</span>
                    {scheduleCount ? (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] text-white">
                        {scheduleCount} escala{scheduleCount > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                  {blockCount ? (
                    <p className="mt-3 text-xs text-[var(--muted)]">{blockCount} bloqueio{blockCount > 1 ? 's' : ''}</p>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--muted)]">Livre</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Dia selecionado</p>
              <h3 className="text-xl capitalize">{selectedDateLabel}</h3>
            </div>
          </div>

          {currentUser?.role === AppRole.ADMIN ? (
            <button
              type="button"
              onClick={() => void createScheduleOnSelectedDay()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm text-white"
            >
              <PlusCircle size={16} /> Criar escala neste dia
            </button>
          ) : null}

          <div className="mt-4 space-y-3">
            {selectedSchedules.length ? (
              selectedSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => {
                    setActiveSection('schedules');
                    selectSchedule(schedule.id);
                  }}
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left"
                >
                  <p className="font-semibold">{schedule.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                      <Clock3 size={14} /> {schedule.time}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                      {schedule.memberCount} membros
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
                Ainda não existe escala marcada para esse dia.
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="flex items-center gap-2">
            <LockKeyhole size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Minha agenda</p>
              <h3 className="text-xl">Indisponibilidade</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
              {selectedDateLabel}
            </div>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo obrigatório: viagem, trabalho, consulta, descanso vocal..."
              className="min-h-[120px] w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            />
            <select
              value={timeSlot}
              onChange={(event) => setTimeSlot(event.target.value as AvailabilityTimeSlot)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
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
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            >
              {recurrenceOptions.map((option) => (
                <option key={option} value={option}>
                  {availabilityRecurrenceLabel[option]}
                </option>
              ))}
            </select>

            {authMessage ? (
              <div className="rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                {authMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoadingCalendar || !reason.trim()}
              className="w-full rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white disabled:opacity-60"
            >
              {isLoadingCalendar ? 'Salvando...' : 'Salvar indisponibilidade'}
            </button>
          </form>
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Bloqueios no dia</p>
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
                <article key={block.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {currentUser?.role === AppRole.ADMIN ? block.userName : 'Meu bloqueio'}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {availabilityTimeSlotLabel[block.timeSlot]} • {availabilityRecurrenceLabel[block.recurrence]}
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
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--muted)]">
                Nenhuma indisponibilidade registrada para este dia.
              </div>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
