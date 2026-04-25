import { ScheduleEventType } from '@louvy/shared';
import { scheduleEventTypeLabel } from '@/lib/labels';
import { formatScheduleDate, getWeekdayLabel } from '@/lib/utils';
import { ScheduleView } from '@/types';

export function ScheduleHeader({ schedule }: { schedule: ScheduleView }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        {scheduleEventTypeLabel[schedule.eventType]} • {schedule.eventLabel}
      </p>
      <h2 className="mt-2 text-3xl leading-none">{schedule.title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)] capitalize">
        {getWeekdayLabel(schedule.date)} • {formatScheduleDate(schedule.date)} • {schedule.time}
      </p>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{schedule.notes}</p>
    </div>
  );
}
