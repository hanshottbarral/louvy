import { AvailabilityBlock, AvailabilityTimeSlot } from '@/types';

function toDateKey(value: Date | string) {
  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string) {
  return new Date(`${value}T12:00:00`);
}

function isFirstSunday(date: Date) {
  return date.getDay() === 0 && date.getDate() <= 7;
}

export function getScheduleTimeSlot(time: string): AvailabilityTimeSlot {
  const [hourString] = time.split(':');
  const hour = Number(hourString);

  if (Number.isNaN(hour)) {
    return 'ANY';
  }

  if (hour < 12) {
    return 'MORNING';
  }

  if (hour < 18) {
    return 'AFTERNOON';
  }

  return 'NIGHT';
}

export function doesAvailabilityBlockApply(
  block: AvailabilityBlock,
  scheduleDate: string,
  scheduleTimeSlot: AvailabilityTimeSlot,
) {
  if (!scheduleDate) {
    return false;
  }

  if (block.timeSlot !== 'ANY' && block.timeSlot !== scheduleTimeSlot) {
    return false;
  }

  const blockDate = parseDateOnly(block.date);
  const targetDate = parseDateOnly(scheduleDate);
  const blockKey = toDateKey(blockDate);
  const targetKey = toDateKey(targetDate);

  if (block.recurrence === 'NONE') {
    return blockKey === targetKey;
  }

  if (targetDate < blockDate) {
    return false;
  }

  const diffDays = Math.round(
    (targetDate.getTime() - blockDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (block.recurrence === 'WEEKLY') {
    return diffDays % 7 === 0;
  }

  if (block.recurrence === 'BIWEEKLY') {
    return diffDays % 15 === 0;
  }

  if (block.recurrence === 'FIRST_SUNDAY_MONTHLY') {
    return isFirstSunday(targetDate);
  }

  if (block.recurrence === 'MONTHLY_BY_DAY') {
    return blockDate.getDate() === targetDate.getDate();
  }

  if (block.recurrence === 'SUNDAY_MORNING_WEEKLY') {
    return targetDate.getDay() === 0 && scheduleTimeSlot === 'MORNING';
  }

  if (block.recurrence === 'SUNDAY_NIGHT_WEEKLY') {
    return targetDate.getDay() === 0 && scheduleTimeSlot === 'NIGHT';
  }

  return false;
}

export function findAvailabilityConflict(
  blocks: AvailabilityBlock[],
  userId: string,
  scheduleDate: string,
  scheduleTime: string,
) {
  const timeSlot = getScheduleTimeSlot(scheduleTime);

  return blocks.find(
    (block) =>
      block.userId === userId && doesAvailabilityBlockApply(block, scheduleDate, timeSlot),
  );
}
