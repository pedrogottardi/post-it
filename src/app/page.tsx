'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, useCallback } from 'react';
import { storage } from '@/lib/storage';
import {
  requestNotificationPermission,
  cancelForReminder,
  scheduleForReminder,
  rescheduleAll,
} from '@/lib/notifications';
import type { DeleteScope, Reminder, SnoozeDuration } from '@/lib/types';
import ReminderCard from '@/components/ReminderCard';
import Toast from '@/components/Toast';
import Link from 'next/link';
import { toDateStr, getDaysInMonth } from '@/lib/dates';
import {
  Pin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Archive,
  AlertTriangle,
  Plus,
} from 'lucide-react';

export default function Home() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [overdue, setOverdue] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivedCount, setArchivedCount] = useState(0);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    onUndo: () => void;
    duration: number;
  } | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const toastId = useRef(0);

  function prevMonth() {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else setMonth(m => m + 1);
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

    if (dx > 0) prevMonth();
    else nextMonth();
  }

  function showToast(message: string, onUndo: () => void, duration = 8000) {
    setToast({ id: ++toastId.current, message, onUndo, duration });
  }

  const dismissToast = useCallback(() => setToast(null), []);

  const loadReminders = useCallback(() => {
    storage.ensureSeriesHaveFuture();
    const all = storage.getAll();
    const start = toDateStr(year, month, 1);
    const end = toDateStr(year, month, getDaysInMonth(year, month));

    // Atrasados: não concluídos, não arquivados, data anterior ao mês atual
    const overdueList = all
      .filter(
        r =>
          !r.archived_at &&
          !r.is_completed &&
          r.due_date &&
          r.due_date < start &&
          !r.skipped_dates?.includes(r.due_date.slice(0, 10))
      )
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

    const filtered = all.filter(r => {
      if (r.archived_at) return false;
      if (!r.due_date) return false;
      return r.due_date >= start && r.due_date <= end;
    });
    filtered.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return (a.due_date || '').localeCompare(b.due_date || '');
    });

    setOverdue(overdueList);
    setReminders(filtered);
    setArchivedCount(storage.getArchived().length);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    const timers = deleteTimers.current;
    requestNotificationPermission().then(granted => {
      if (granted) rescheduleAll(storage.getAll());
    });
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  function handleToggle(id: string, completed: boolean) {
    const reminder = storage.getById(id);
    if (!reminder) return;

    storage.update(id, { is_completed: completed });
    let createdNext: Reminder | null = null;

    if (completed) {
      cancelForReminder(id);
      if (reminder.group_id) {
        createdNext = storage.extendSeriesIfLast(id);
        if (createdNext) scheduleForReminder(createdNext);
      }
    } else {
      storage.update(id, { snoozed_until: null });
      scheduleForReminder({ ...reminder, is_completed: false });
    }

    setReminders(prev => prev.map(r => (r.id === id ? { ...r, is_completed: completed } : r)));

    if (completed) {
      if (reminder.group_id) loadReminders();
      showToast('Lembrete concluído', () => {
        storage.update(id, { is_completed: false });
        if (createdNext) storage.delete(createdNext.id);
        scheduleForReminder({ ...reminder, is_completed: false });
        loadReminders();
      });
    }
  }

  function handleArchive(id: string) {
    const reminder = storage.getById(id);
    if (!reminder) return;

    storage.update(id, { archived_at: new Date().toISOString() });
    cancelForReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
    setArchivedCount(storage.getArchived().length);

    showToast('Lembrete arquivado', () => {
      storage.restoreArchived(id);
      scheduleForReminder({ ...reminder, archived_at: null });
      loadReminders();
    });
  }

  function handleDelete(id: string, scope: DeleteScope) {
    const reminder = storage.getById(id);
    if (!reminder) return;

    const targets =
      scope === 'all' && reminder.group_id ? storage.getGroupAll(reminder.group_id) : [reminder];
    const ids = targets.map(r => r.id);
    const removed = targets.map(r => ({ ...r }));

    for (const r of removed) cancelForReminder(r.id);
    storage.deleteMany(ids);

    const visibleIds = new Set(reminders.map(r => r.id));
    const animatedIds = ids.filter(gid => visibleIds.has(gid));
    setExitingIds(prev => new Set([...prev, ...animatedIds]));

    const timer = setTimeout(() => {
      setReminders(prev => prev.filter(r => !ids.includes(r.id)));
      setExitingIds(prev => {
        const next = new Set(prev);
        for (const gid of animatedIds) next.delete(gid);
        return next;
      });
      deleteTimers.current.delete(id);
    }, 200);
    deleteTimers.current.set(id, timer);

    showToast(
      removed.length > 1 ? `${removed.length} lembretes excluídos` : 'Lembrete excluído',
      () => {
        const pending = deleteTimers.current.get(id);
        if (pending) {
          clearTimeout(pending);
          deleteTimers.current.delete(id);
        }
        storage.restoreAll(removed);
        for (const r of removed) scheduleForReminder(r);
        setExitingIds(prev => {
          const next = new Set(prev);
          for (const gid of animatedIds) next.delete(gid);
          return next;
        });
        loadReminders();
      }
    );
  }

  function handleSnooze(id: string, duration: SnoozeDuration) {
    const reminder = storage.getById(id);
    if (!reminder) return;

    // "custom" é tratado no modal de edição, não aqui
    if (duration === 'custom') return;

    const updated = storage.snooze(id, duration);
    if (!updated) return;

    cancelForReminder(id);
    scheduleForReminder(updated);
    setReminders(prev => prev.map(r => (r.id === id ? updated : r)));
    setOverdue(prev => prev.filter(r => r.id !== id));

    const targetLabel = `${dayLabel(updated.due_date ?? reminder.due_date ?? '')} às ${formatTime(
      updated.due_time
    )}`;

    showToast(`Lembrete adiado para ${targetLabel}`, () => {
      storage.update(id, {
        due_date: reminder.due_date,
        due_time: reminder.due_time,
        snoozed_until: null,
      });
      scheduleForReminder({ ...reminder, snoozed_until: null });
      loadReminders();
    });
  }

  function openOverdue(reminder: Reminder) {
    if (!reminder.due_date) return;
    const [dueYear, dueMonth] = reminder.due_date.slice(0, 10).split('-').map(Number);
    setYear(dueYear);
    setMonth(dueMonth - 1);
    setHighlightId(reminder.id);

    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 3200);
  }

  const pending = reminders.filter(r => !r.is_completed);
  const done = reminders.filter(r => r.is_completed);

  function dayLabel(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `${d} de ${dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} · ${weekday}`;
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '09:00';
    const [h, m] = timeStr.split(':');
    return `${h}:${m}`;
  }

  function groupByDay(list: Reminder[]) {
    const groups = new Map<string, Reminder[]>();
    for (const r of list) {
      const key = r.due_date ? r.due_date.slice(0, 10) : '';
      const existing = groups.get(key) ?? [];
      existing.push(r);
      groups.set(key, existing);
    }
    return groups;
  }

  function groupOverdueByTitle(list: Reminder[]) {
    const groups = new Map<string, Reminder[]>();
    for (const r of list) {
      const key = r.title;
      const existing = groups.get(key) ?? [];
      existing.push(r);
      groups.set(key, existing);
    }
    return groups;
  }

  const pendingByDay = groupByDay(pending);
  const doneByDay = groupByDay(done);
  const overdueByTitle = groupOverdueByTitle(overdue);

  const hasOverdue = overdue.length > 0;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <>
      <header className="sticky top-0 z-40 border-b-3 border-black bg-yellow-400">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <h1 className="text-base font-extrabold text-black flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Post-it
          </h1>
          <div className="flex items-center gap-1.5">
            <Link
              href="/archived"
              aria-label="Lembretes arquivados"
              className="relative flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              title="Lembretes arquivados"
            >
              <Archive className="h-5 w-5" />
              {archivedCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center border border-black bg-red-500 px-1.5 text-[10px] font-bold text-white rounded-full">
                  {archivedCount}
                </span>
              )}
            </Link>
            <span className="flex h-11 w-auto items-center justify-center border-2 border-black bg-white px-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              {pending.length} pendente{pending.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-lg flex-1 px-5 pb-24 pt-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative mb-4 flex items-center">
          <button
            onClick={prevMonth}
            aria-label="Mês anterior"
            className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="pointer-events-none absolute left-1/2 max-w-[50%] -translate-x-1/2 truncate text-sm font-extrabold uppercase tracking-wider text-zinc-700">
            {new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            {(year !== today.getFullYear() || month !== today.getMonth()) && (
              <button
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth());
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <CalendarDays className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 animate-pulse bg-zinc-200" />
            ))}
          </div>
        ) : (
          <>
            {/* Seção de Atrasados */}
            {hasOverdue && (
              <div className="mb-6 animate-slide-up overflow-hidden border border-amber-300 bg-amber-50/70">
                <button
                  type="button"
                  onClick={() => setOverdueExpanded(e => !e)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  aria-expanded={overdueExpanded}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                    Atrasados ({overdue.length})
                  </h2>
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 ml-auto text-amber-600/70 transition-transform ${overdueExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                {overdueExpanded && (
                  <div className="flex flex-col">
                    {Array.from(overdueByTitle.entries()).map(([title, items]) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => openOverdue(items[0])}
                        className="flex w-full items-center gap-2 border-t border-amber-200 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-100/70"
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold text-zinc-800">
                          {title}
                          {items.length > 1 && (
                            <span className="ml-1.5 text-[11px] font-medium text-amber-600">
                              ({items.length})
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-amber-700">
                          {formatTime(items[0].due_time)}
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-500">
                          {dayLabel(items[0].due_date!)}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-600/70" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {reminders.length === 0 && !hasOverdue ? (
              <div className="mt-16 flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">📌</span>
                <h2 className="text-xl font-bold text-zinc-800 max-w-xs">
                  {isCurrentMonth ? 'Nenhum lembrete neste mês' : 'Nenhum lembrete neste mês'}
                </h2>
                <p className="text-sm text-zinc-500 max-w-xs text-center">
                  {isCurrentMonth
                    ? 'Crie um lembrete para começar'
                    : 'Navegue para outro mês ou crie um novo'}
                </p>
                <Link
                  href="/new"
                  className="mt-2 min-h-[44px] border-2 border-black bg-yellow-400 px-6 py-3 font-bold text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
                >
                  <span>Criar lembrete</span>
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {Array.from(pendingByDay.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dayKey, list]) => (
                    <div key={dayKey}>
                      <h3 className="mb-2 border-b-2 border-black pb-1 text-xs font-extrabold uppercase tracking-widest text-zinc-500 max-w-full">
                        {dayLabel(dayKey)}
                      </h3>
                      <div className="flex flex-col gap-3">
                        {list.map(r => (
                          <ReminderCard
                            key={r.id}
                            reminder={r}
                            onToggle={handleToggle}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            onSnooze={handleSnooze}
                            exiting={exitingIds.has(r.id)}
                            highlighted={highlightId === r.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                {done.length > 0 && (
                  <>
                    <h2 className="mb-1 mt-3 px-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Concluídas
                    </h2>
                    {Array.from(doneByDay.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dayKey, list]) => (
                        <div key={dayKey}>
                          <h3 className="mb-2 border-b-2 border-zinc-200 pb-1 text-xs font-extrabold uppercase tracking-widest text-zinc-400 max-w-full">
                            {dayLabel(dayKey)}
                          </h3>
                          <div className="flex flex-col gap-2">
                            {list.map(r => (
                              <ReminderCard
                                key={r.id}
                                reminder={r}
                                onToggle={handleToggle}
                                onArchive={handleArchive}
                                onDelete={handleDelete}
                                onSnooze={handleSnooze}
                                exiting={exitingIds.has(r.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {!toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-40">
          <div className="mx-auto flex max-w-lg justify-end px-5">
            <Link
              href="/new"
              aria-label="Novo lembrete"
              title="Novo lembrete"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center border-2 border-black bg-yellow-400 text-zinc-900 shadow-[3px_3px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={dismissToast}
          duration={toast.duration}
        />
      )}
    </>
  );
}
