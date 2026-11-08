'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { scheduleForReminder, cancelForReminder } from '@/lib/notifications';
import type { DeleteScope, Reminder } from '@/lib/types';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { ArrowLeft, Archive, Trash2, RotateCcw, X } from 'lucide-react';

export default function ArchivedPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    onUndo: () => void;
    duration: number;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const toastId = useRef(0);

  // Fecha modal de exclusão com Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && confirmDeleteId) {
        setConfirmDeleteId(null);
      }
    }
    if (confirmDeleteId) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmDeleteId]);

  function load() {
    const all = storage.getArchived();
    all.sort((a, b) => {
      const da = a.archived_at || a.created_at;
      const db = b.archived_at || b.created_at;
      return db.localeCompare(da);
    });
    setReminders(all);
    setLoading(false);
  }

  useEffect(() => {
    storage.init().then(load);
    return () => {};
  }, []);

  function showToast(message: string, onUndo: () => void, duration = 6000) {
    setToast({ id: ++toastId.current, message, onUndo, duration });
  }

  const dismissToast = useCallback(() => setToast(null), []);

  function handleRestore(id: string) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    storage.restoreArchived(id);
    scheduleForReminder({ ...reminder, archived_at: null });
    load();
    showToast('Lembrete restaurado', () => {
      storage.update(id, { archived_at: new Date().toISOString() });
      cancelForReminder(id);
      load();
    });
  }

  function handleDelete(id: string, scope: DeleteScope) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const targets =
      scope === 'all' && reminder.group_id ? storage.getGroupAll(reminder.group_id) : [reminder];
    const removed = targets.map(r => ({ ...r }));

    for (const r of removed) cancelForReminder(r.id);
    storage.deleteMany(removed.map(r => r.id));
    setConfirmDeleteId(null);
    load();
    showToast(
      removed.length > 1 ? `${removed.length} lembretes excluídos` : 'Lembrete excluído',
      () => {
        storage.restoreAll(removed);
        for (const r of removed) scheduleForReminder(r);
        load();
      }
    );
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const confirmDeleteReminder = confirmDeleteId
    ? (reminders.find(r => r.id === confirmDeleteId) ?? null)
    : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <header className="sticky top-0 z-40 border-b-3 border-black bg-yellow-400">
        <div className="flex items-center gap-3 px-5 py-3">
          <Link
            href="/"
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-extrabold text-black">Arquivados</h1>
          <span className="ml-auto border-2 border-black bg-white px-2.5 py-0.5 text-[11px] font-bold text-black">
            {reminders.length} arquivado{reminders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <main className="flex-1 px-5 pb-24 pt-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 animate-pulse bg-zinc-200" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <span className="text-5xl">📦</span>
            <h2 className="text-xl font-bold text-zinc-800">Nenhum lembrete arquivado</h2>
            <p className="text-sm text-zinc-500">Arquive lembretes para organizar sua lista</p>
            <Link
              href="/"
              className="mt-2 border-2 border-black bg-yellow-400 px-6 py-3 font-bold text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Voltar
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reminders.map(r => (
              <div
                key={r.id}
                className="flex items-start gap-3 border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000] animate-slide-up"
              >
                <Archive className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-800">{r.title}</h3>
                  {r.description && (
                    <p className="mt-0.5 text-[13px] text-zinc-400 line-clamp-2">{r.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
                    {r.due_date && <span>Vencia em {formatDate(r.due_date)}</span>}
                    <span className="font-semibold text-zinc-500">
                      Arquivado em {formatDate(r.archived_at)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleRestore(r.id)}
                    aria-label="Restaurar lembrete"
                    title="Restaurar"
                    className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-emerald-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-emerald-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(r.id)}
                    aria-label="Excluir lembrete"
                    title="Excluir"
                    className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-red-400 shadow-[2px_2px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
          <div className="w-full max-w-sm border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] animate-scale-in">
            <p className="text-sm font-bold text-zinc-900">Excluir lembrete?</p>
            <p className="mt-1 text-xs text-zinc-500">
              {confirmDeleteReminder?.group_id
                ? 'Este lembrete faz parte de uma série. Excluir só este ou todos os recorrentes? A opção "Todos" remove a série inteira, inclusive as concluídas.'
                : 'Esta ação pode ser desfeita em seguida.'}
            </p>
            {confirmDeleteReminder?.group_id ? (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => handleDelete(confirmDeleteId, 'all')}
                  className="h-11 w-11 border-2 border-black bg-red-500 text-white transition-colors active:translate-x-0.5 active:translate-y-0.5"
                  aria-label="Excluir todos os recorrentes"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId, 'single')}
                  className="h-11 w-11 border-2 border-black bg-white text-zinc-700 transition-colors active:translate-x-0.5 active:translate-y-0.5"
                  aria-label="Excluir só este"
                >
                  <Trash2 className="h-5 w-5 text-zinc-500" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="h-11 w-11 border-2 border-transparent bg-transparent text-zinc-500 transition-colors hover:text-zinc-700"
                  aria-label="Cancelar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="h-11 w-11 border-2 border-black bg-white text-zinc-600 transition-colors active:translate-x-0.5 active:translate-y-0.5"
                  aria-label="Cancelar"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId, 'single')}
                  className="h-11 w-11 border-2 border-black bg-red-500 text-white transition-colors hover:bg-red-600 active:translate-x-0.5 active:translate-y-0.5"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
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
    </div>
  );
}
