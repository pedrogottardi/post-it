import type { SnoozeDuration } from './types';

/**
 * Calcula o novo dia/hora de um lembrete adiado.
 *
 * O adiamento é relativo à data/hora do próprio lembrete — não ao momento
 * atual. Se o lembrete já estiver atrasado, usa `now` como base para não
 * mover a ocorrência para o passado.
 */
export function getSnoozeTarget(
  dueDate: string | null,
  dueTime: string | null,
  duration: SnoozeDuration,
  customDate?: string,
  now: Date = new Date()
): Date | null {
  if (duration === 'custom') {
    if (!customDate) return null;
    const custom = new Date(customDate);
    return Number.isNaN(custom.getTime()) ? null : custom;
  }

  if (!dueDate) return null;

  const [y, m, d] = dueDate.slice(0, 10).split('-').map(Number);
  const [hour, minute] = (dueTime ?? '09:00').split(':').map(Number);
  const scheduled = new Date(y, m - 1, d, hour, minute, 0, 0);
  const base = scheduled.getTime() > now.getTime() ? scheduled : now;
  const target = new Date(base);

  switch (duration) {
    case '1h':
      target.setTime(base.getTime() + 60 * 60 * 1000);
      break;
    case 'tonight':
      target.setHours(21, 0, 0, 0);
      if (target <= base) target.setDate(target.getDate() + 1);
      break;
    case 'tomorrow':
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
      break;
  }

  return target;
}
