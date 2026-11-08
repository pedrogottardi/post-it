'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { storage } from '@/lib/storage';
import type { Reminder } from '@/lib/types';
import { toDateStr, getDaysInMonth } from '@/lib/dates';
import { ChevronLeft, ChevronRight, Wallet, Calendar, Pin, Plus } from 'lucide-react';
import Link from 'next/link';

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const typeDot: Record<string, string> = {
  payment: 'bg-emerald-500',
  event: 'bg-blue-500',
  reminder: 'bg-amber-500',
};

const typeIcon: Record<string, typeof Wallet> = {
  payment: Wallet,
  event: Calendar,
  reminder: Pin,
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [loading, setLoading] = useState(true);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastSwipeAt = useRef(0);

  const loadReminders = useCallback(() => {
    const all = storage.getAll();
    const start = toDateStr(year, month, 1);
    const end = toDateStr(year, month, getDaysInMonth(year, month));
    const filtered = all.filter(r => {
      if (r.archived_at) return false;
      if (r.is_completed) return false;
      if (!r.due_date) return false;
      return r.due_date >= start && r.due_date <= end;
    });
    filtered.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    setReminders(filtered);
    setLoading(false);
  }, [year, month]);

  // Busca atrasados para mostrar no calendário
  const [overdueReminders, setOverdueReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    storage.init().then(() => {
      loadReminders();
      const all = storage.getAll();
      const start = toDateStr(year, month, 1);
      const overdue = all.filter(
        r =>
          !r.archived_at &&
          !r.is_completed &&
          r.due_date &&
          r.due_date < start &&
          !r.skipped_dates?.includes(r.due_date.slice(0, 10))
      );
      setOverdueReminders(overdue);
    });
  }, [loadReminders, year, month]);

  const remindersByDay = useMemo(() => {
    const map = new Map<number, Reminder[]>();
    for (const r of reminders) {
      if (!r.due_date) continue;
      const day = Number(r.due_date.slice(0, 10).split('-')[2]);
      const existing = map.get(day) ?? [];
      existing.push(r);
      map.set(day, existing);
    }
    return map;
  }, [reminders]);

  const overdueByDay = useMemo(() => {
    const map = new Map<number, Reminder[]>();
    for (const r of overdueReminders) {
      if (!r.due_date) continue;
      const [rYear, rMonth] = r.due_date.slice(0, 10).split('-').map(Number);
      // Só mostra atrasados no mês/ano em que realmente venceram
      if (rYear !== year || rMonth - 1 !== month) continue;
      const day = Number(r.due_date.slice(0, 10).split('-')[2]);
      const existing = map.get(day) ?? [];
      existing.push(r);
      map.set(day, existing);
    }
    return map;
  }, [overdueReminders, year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const selectedReminders = selectedDay ? (remindersByDay.get(selectedDay) ?? []) : [];

  function prevMonth() {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    if (!start) return;
    touchStart.current = null;

    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    const dt = Date.now() - start.time;

    if (dt > 300) return;
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

    // Evita que o toque que virou arrasto selecione um dia por engano
    lastSwipeAt.current = Date.now();

    if (dx > 0) prevMonth();
    else nextMonth();
  }

  const monthName = new Date(year, month).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="mx-auto w-full max-w-lg flex-1 px-5 pb-24 pt-5"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={prevMonth}
          aria-label="Mês anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-center text-sm font-extrabold uppercase tracking-wider text-zinc-700">
          {monthName}
        </h2>
        <button
          onClick={nextMonth}
          aria-label="Próximo mês"
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-hidden border-2 border-black bg-white">
        <div className="grid grid-cols-7 gap-px bg-zinc-200">
          {weekdayLabels.map(label => (
            <div
              key={label}
              className="bg-white py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              {label}
            </div>
          ))}

          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayReminders = remindersByDay.get(day);
            const dayOverdue = overdueByDay.get(day);
            const hasOverdue = dayOverdue && dayOverdue.length > 0;
            const isToday =
              day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                onClick={() => {
                  if (Date.now() - lastSwipeAt.current < 400) return;
                  setSelectedDay(day);
                }}
                aria-label={`Dia ${day}${dayReminders ? `, ${dayReminders.length} lembrete(s)` : ''}${hasOverdue ? `, ${dayOverdue.length} atrasado(s)` : ''}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center border-2 py-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                  isSelected
                    ? 'border-black bg-yellow-400 text-black'
                    : isToday
                      ? 'border-yellow-400 bg-white text-black'
                      : hasOverdue
                        ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-transparent bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span className="text-sm font-bold">{day}</span>
                {dayReminders && (
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    {dayReminders.slice(0, 3).map(r => (
                      <span key={r.id} className={`h-2 w-2 rounded-full ${typeDot[r.type]}`} />
                    ))}
                    {dayReminders.length > 3 && (
                      <span className="text-[9px] font-bold text-zinc-400">
                        +{dayReminders.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {hasOverdue && !dayReminders && (
                  <div className="mt-0.5 flex gap-0.5">
                    {dayOverdue.slice(0, 3).map(r => (
                      <span key={r.id} className="h-1.5 w-1.5 bg-red-500" />
                    ))}
                    {dayOverdue.length > 3 && (
                      <span className="text-[9px] text-red-600">+{dayOverdue.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedReminders.length > 0 && (
        <div className="mt-6 animate-fade-in">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400 pl-1">
            Lembretes — {selectedDay}
          </h3>
          <div className="flex flex-col gap-3">
            {selectedReminders.map(r => (
              <ReminderRow key={r.id} reminder={r} />
            ))}
          </div>
        </div>
      )}

      {selectedReminders.length === 0 && selectedDay && !loading && (
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-400">Nenhum lembrete neste dia</p>
          <Link
            href={`/new?date=${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`}
            className="mt-2 inline-flex min-h-[44px] border-2 border-black bg-yellow-400 px-4 py-2 text-sm font-bold text-black shadow-[2px_2px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
          >
            <span>Adicionar lembrete neste dia</span>
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      )}

      {loading && (
        <div className="mt-6 flex flex-col gap-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse bg-zinc-200" />
          ))}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-600 border-t-2 border-zinc-200 pt-4 px-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Pagamento
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          Evento
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          Lembrete
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500" />
          Atrasado
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 border-2 border-yellow-400" />
          Hoje
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 border-2 border-black bg-yellow-400" />
          Selecionado
        </div>
      </div>
    </div>
  );
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const Icon = typeIcon[reminder.type] ?? typeIcon.reminder;

  return (
    <div className="flex items-center gap-3 border-2 border-black bg-white p-3">
      <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
      <span className="flex-1 text-sm font-bold text-black">{reminder.title}</span>
      {typeof reminder.amount === 'number' && (
        <span className="ml-auto text-xs font-bold text-emerald-600">
          {reminder.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )}
    </div>
  );
}
