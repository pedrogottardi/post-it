'use client';

import type { ReminderFormData, ReminderType, Recurrence } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { Wallet, Calendar, Pin } from 'lucide-react';

const types: { value: ReminderType; icon: typeof Wallet; label: string }[] = [
  { value: 'payment', icon: Wallet, label: 'Pagamento' },
  { value: 'event', icon: Calendar, label: 'Evento' },
  { value: 'reminder', icon: Pin, label: 'Lembrete' },
];

const recurrences: { value: Recurrence; label: string; shortLabel: string }[] = [
  { value: 'none', label: 'Não repetir', shortLabel: 'Não' },
  { value: 'daily', label: 'Diária', shortLabel: 'Dia' },
  { value: 'weekly', label: 'Semanal', shortLabel: 'Sem' },
  { value: 'monthly', label: 'Mensal', shortLabel: 'Mês' },
  { value: 'yearly', label: 'Anual', shortLabel: 'Ano' },
];

export default function ReminderForm({
  initialData,
  onSubmit,
  isLoading,
}: {
  initialData?: ReminderFormData;
  onSubmit: (data: ReminderFormData) => void;
  isLoading: boolean;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ReminderFormData>(
    initialData ?? {
      title: '',
      description: '',
      type: 'reminder',
      due_date: '',
      due_time: '',
      amount: '',
      recurrence: 'none',
    }
  );
  const hasDate = form.due_date.length > 0;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.due_date) return;
    onSubmit(form);
  };

  function updateField<K extends keyof ReminderFormData>(key: K, value: ReminderFormData[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'due_date' && !value) {
        next.recurrence = 'none';
        next.due_time = '';
      }
      return next;
    });
  }

  function formatAmount(value: string): string {
    const numeric = value.replace(/[^\d]/g, '');
    if (!numeric) return '';
    const formatted = (Number(numeric) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatted;
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatAmount(e.target.value);
    updateField('amount', formatted);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700">
          Título
        </label>
        <input
          ref={titleRef}
          type="text"
          required
          placeholder="Ex: Conta de luz"
          value={form.title}
          onChange={e => updateField('title', e.target.value)}
          className="w-full border-2 border-black bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-yellow-400"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700">
          Tipo
        </label>
        <div className="grid grid-cols-3 gap-2">
          {types.map(t => {
            const Icon = t.icon;
            const selected = form.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => updateField('type', t.value)}
                className={`flex items-center justify-center gap-1.5 border-2 px-3 py-2.5 text-sm font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                  selected
                    ? 'border-black bg-yellow-400 text-black'
                    : 'border-black bg-white text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[13px]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700">
          Descrição
        </label>
        <textarea
          placeholder="Descrição opcional..."
          value={form.description}
          onChange={e => updateField('description', e.target.value)}
          rows={3}
          className="w-full resize-none border-2 border-black bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-yellow-400"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700">
          Data
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            required
            value={form.due_date}
            onChange={e => updateField('due_date', e.target.value)}
            className="flex-1 border-2 border-black bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-yellow-400"
          />
          <input
            type="time"
            value={form.due_time}
            onChange={e => updateField('due_time', e.target.value)}
            disabled={!hasDate}
            className={`w-32 shrink-0 border-2 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-yellow-400 ${
              hasDate ? 'border-black' : 'border-zinc-300 text-zinc-400 cursor-not-allowed'
            }`}
            aria-label="Horário"
          />
        </div>
        {!hasDate && (
          <p className="mt-1.5 text-[11px] font-semibold text-zinc-400">
            Escolha uma data para definir o horário.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700">
          Repetição
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {recurrences.map(r => (
            <button
              key={r.value}
              type="button"
              disabled={!hasDate}
              onClick={() => updateField('recurrence', r.value)}
              className={`border-2 px-1 py-2 text-[11px] font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                form.recurrence === r.value
                  ? 'border-black bg-yellow-400 text-black'
                  : 'border-black bg-white text-zinc-500 hover:bg-zinc-100'
              }`}
              title={r.label}
            >
              {r.shortLabel}
            </button>
          ))}
        </div>
        {!hasDate && (
          <p className="mt-1.5 text-[11px] font-semibold text-zinc-400">
            Escolha uma data para poder repetir o lembrete.
          </p>
        )}
      </div>

      {form.type === 'payment' && (
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700">
            Valor
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              onChange={handleAmountChange}
              className="w-full border-2 border-black bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-yellow-400"
              aria-label="Valor em reais"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full border-2 border-black bg-yellow-400 py-3 text-sm font-bold text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Salvando...' : 'Salvar lembrete'}
      </button>
    </form>
  );
}
