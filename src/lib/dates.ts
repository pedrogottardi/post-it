export function localDateFrom(str: string) {
  const [y, m, d] = str.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(date: Date) {
  return toDateStr(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getNextDate(recurrence: string, from: string): string | null {
  const [y, m, d] = from.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;

  switch (recurrence) {
    case 'daily': {
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() + 1);
      return formatDate(date);
    }
    case 'weekly': {
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() + 7);
      return formatDate(date);
    }
    case 'monthly': {
      // Clamp to the last day of the next month (31/jan + 1 mês = 28/fev).
      const targetMonth = new Date(y, m, 1);
      const day = Math.min(d, getDaysInMonth(targetMonth.getFullYear(), targetMonth.getMonth()));
      return toDateStr(targetMonth.getFullYear(), targetMonth.getMonth(), day);
    }
    case 'yearly': {
      const day = Math.min(d, getDaysInMonth(y + 1, m - 1));
      return toDateStr(y + 1, m - 1, day);
    }
    default:
      return null;
  }
}

export function daysBetween(from: string, to: string) {
  const a = localDateFrom(from);
  const b = localDateFrom(to);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function shiftDate(dateStr: string, days: number) {
  const date = localDateFrom(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}
