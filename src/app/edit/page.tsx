'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { storage, type SeriesUpdate } from '@/lib/storage';
import { scheduleForReminder, cancelForReminder } from '@/lib/notifications';
import { formatAmountForInput, parseAmount } from '@/lib/money';
import ReminderForm from '@/components/ReminderForm';
import type { Reminder, ReminderFormData } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, X } from 'lucide-react';

export default function EditPage() {
  return (
    <Suspense>
      <EditReminder />
    </Suspense>
  );
}

function EditReminder() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingData, setPendingData] = useState<ReminderFormData | null>(null);

  // Fecha modal com Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && pendingData) {
        setPendingData(null);
      }
    }
    if (pendingData) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pendingData]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    storage.init().then(() => {
      const data = storage.getById(id);
      if (data) {
        setReminder(data);
      }
      setLoading(false);
    });
  }, [id]);

  function toSeriesUpdate(data: ReminderFormData): SeriesUpdate {
    return {
      title: data.title,
      description: data.description,
      type: data.type,
      due_date: data.due_date,
      due_time: data.due_time || null,
      amount: parseAmount(data.amount),
      recurrence: data.recurrence,
    };
  }

  function hasChanges(data: ReminderFormData) {
    if (!reminder) return false;
    return (
      data.title !== reminder.title ||
      (data.description ?? '') !== (reminder.description ?? '') ||
      data.type !== reminder.type ||
      (data.due_date || '') !== (reminder.due_date ? reminder.due_date.slice(0, 10) : '') ||
      (data.due_time || '') !== (reminder.due_time ?? '') ||
      data.recurrence !== reminder.recurrence ||
      parseAmount(data.amount) !== (typeof reminder.amount === 'number' ? reminder.amount : null)
    );
  }

  function handleSubmit(data: ReminderFormData) {
    if (!id || !reminder) return;
    if (!hasChanges(data)) {
      router.push('/');
      return;
    }
    if (reminder.group_id) {
      setPendingData(data);
      return;
    }
    save(data, 'all');
  }

  function save(data: ReminderFormData, scope: 'single' | 'all') {
    if (!id || !reminder) return;
    setSaving(true);

    const update = toSeriesUpdate(data);

    if (scope === 'single') {
      const updated = storage.updateSingle(id, update);
      if (updated) {
        cancelForReminder(id);
        scheduleForReminder(updated);
      }
    } else {
      const { updated, removed } = storage.updateSeries(id, update);
      for (const item of removed) cancelForReminder(item.id);
      for (const item of updated) {
        cancelForReminder(item.id);
        scheduleForReminder(item);
      }
    }

    setSaving(false);
    router.push('/');
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-4">
        <div className="h-8 w-24 animate-pulse bg-zinc-200" />
        <div className="mt-8 h-96 animate-pulse bg-zinc-200" />
      </div>
    );
  }

  if (!reminder || !id) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5">
        <p className="text-zinc-500">Lembrete não encontrado</p>
        <Link
          href="/"
          className="mt-4 border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5">
      <header className="flex items-center gap-4 py-4">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-extrabold text-black flex-1 text-center">Editar lembrete</h1>
      </header>

      <div className="flex-1 pb-24">
        <ReminderForm
          initialData={{
            title: reminder.title,
            description: reminder.description ?? '',
            type: reminder.type,
            due_date: reminder.due_date ? reminder.due_date.slice(0, 10) : '',
            amount: formatAmountForInput(reminder.amount),
            due_time: reminder.due_time ?? '',
            recurrence: reminder.recurrence,
          }}
          onSubmit={handleSubmit}
          isLoading={saving}
        />
      </div>

      {pendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
          <div className="w-full max-w-sm border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] animate-scale-in">
            <p className="text-sm font-bold text-zinc-900">Aplicar alterações</p>
            <p className="mt-1 text-xs text-zinc-500">
              Este lembrete faz parte de uma série recorrente. Aplicar a mudança só a este lembrete
              ou a todos os recorrentes? As ocorrências concluídas e passadas não são alteradas.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => save(pendingData, 'all')}
                className="flex h-11 w-full items-center justify-center gap-2 border-2 border-black bg-yellow-400 px-3 text-sm font-bold text-black transition-colors hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5"
              >
                <CalendarDays className="h-4 w-4" />
                Aplicar a todos os recorrentes
              </button>
              <button
                onClick={() => save(pendingData, 'single')}
                className="flex h-11 w-full items-center justify-center gap-2 border-2 border-black bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
              >
                <CalendarDays className="h-4 w-4 text-zinc-500" />
                Aplicar só a este
              </button>
              <button
                onClick={() => setPendingData(null)}
                className="flex h-11 w-full items-center justify-center gap-2 border-2 border-transparent bg-transparent px-3 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
