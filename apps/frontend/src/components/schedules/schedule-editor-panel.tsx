'use client';

import { ScheduleEventType } from '@louvy/shared';
import { CalendarDays, CalendarRange, Save, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { scheduleEventTypeLabel } from '@/lib/labels';
import { getMonthDayLabel, getWeekdayLabel } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';

const eventTypeOptions = [
  { value: ScheduleEventType.SERVICE, label: scheduleEventTypeLabel.SERVICE },
  { value: ScheduleEventType.REHEARSAL, label: scheduleEventTypeLabel.REHEARSAL },
  { value: ScheduleEventType.SPECIAL, label: scheduleEventTypeLabel.SPECIAL },
];

export function ScheduleEditorPanel({ schedule }: { schedule: ScheduleView }) {
  const saveSchedule = useAppStore((state) => state.saveSchedule);
  const [title, setTitle] = useState(schedule.title);
  const [date, setDate] = useState(schedule.date);
  const [time, setTime] = useState(schedule.time);
  const [eventType, setEventType] = useState(schedule.eventType);
  const [eventLabel, setEventLabel] = useState(schedule.eventLabel);
  const [notes, setNotes] = useState(schedule.notes ?? '');

  useEffect(() => {
    setTitle(schedule.title);
    setDate(schedule.date);
    setTime(schedule.time);
    setEventType(schedule.eventType);
    setEventLabel(schedule.eventLabel);
    setNotes(schedule.notes ?? '');
  }, [schedule]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await saveSchedule({
      id: schedule.id,
      title,
      date,
      time,
      eventType,
      eventLabel,
      notes,
    });
  };

  const createNewSchedule = async () => {
    const now = new Date();
    const nextDate = now.toISOString().slice(0, 10);
    const nextId = await saveSchedule({
      title: 'Nova escala',
      date: nextDate,
      time: '19:00',
      eventType: ScheduleEventType.SERVICE,
      eventLabel: 'Culto da noite',
      notes: 'Defina equipe, setlist e observacoes.',
    });

    if (nextId) {
      setTitle('Nova escala');
      setDate(nextDate);
      setTime('19:00');
      setEventType(ScheduleEventType.SERVICE);
      setEventLabel('Culto da noite');
      setNotes('Defina equipe, setlist e observacoes.');
    }
  };

  return (
    <section className="glass rounded-3xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Planejamento</p>
          <h3 className="text-xl">Criar e editar escala</h3>
        </div>
        <button
          type="button"
          onClick={() => void createNewSchedule()}
          className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-white"
        >
          Nova escala
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--muted)]">Titulo da escala</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Data</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Horario</span>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays size={16} /> Dia da semana
            </p>
            <p className="mt-1 text-sm capitalize text-[var(--muted)]">{getWeekdayLabel(date)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarRange size={16} /> Dia do mes
            </p>
            <p className="mt-1 text-sm capitalize text-[var(--muted)]">{getMonthDayLabel(date)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Tipo</span>
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value as ScheduleEventType)}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Evento especifico</span>
            <input
              value={eventLabel}
              onChange={(event) => setEventLabel(event.target.value)}
              placeholder="Culto da manha, culto da noite, ceia..."
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--muted)]">Observacoes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
          />
        </label>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-sm text-[var(--muted)]">
          <p className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <Sparkles size={16} /> Resumo rapido
          </p>
          <p className="mt-2">
            {title} em {getWeekdayLabel(date)}, {getMonthDayLabel(date)}, as {time}. Evento: {eventLabel}.
          </p>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-white"
        >
          <Save size={16} /> Salvar escala
        </button>
      </form>
    </section>
  );
}
