'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DeleteScope, Reminder, SnoozeDuration } from '@/lib/types';
import { getSnoozeTarget } from '@/lib/snooze';
import Link from 'next/link';
import {
  Wallet,
  Calendar,
  Pin,
  Check,
  EllipsisVertical,
  Pencil,
  Archive,
  Trash2,
  CalendarDays,
  CircleDollarSign,
  Repeat,
  Moon,
  Bell,
  Clock,
  X,
} from 'lucide-react';

const recurrenceLabels: Record<string, string> = {
  none: '',
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const typeConfig = {
  payment: {
    icon: Wallet,
    label: 'Pagamento',
    badge: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  event: {
    icon: Calendar,
    label: 'Evento',
    badge: 'border-blue-300 bg-blue-50 text-blue-700',
  },
  reminder: {
    icon: Pin,
    label: 'Lembrete',
    badge: 'border-amber-300 bg-amber-50 text-amber-700',
  },
};

function formatTime(timeStr: string | null) {
  if (!timeStr) return '09:00';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

function snoozeHint(date: string | null, time: string | null, duration: SnoozeDuration) {
  const target = getSnoozeTarget(date, time, duration);
  if (!target) return '';
  const day = target
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    .replace('.', '');
  const hour = `${String(target.getHours()).padStart(2, '0')}:${String(
    target.getMinutes()
  ).padStart(2, '0')}`;
  return `${day} · ${hour}`;
}

export default function ReminderCard({
  reminder,
  onToggle,
  onArchive,
  onDelete,
  onSnooze,
  exiting,
  highlighted,
}: {
  reminder: Reminder;
  onToggle: (id: string, completed: boolean) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string, scope: DeleteScope) => void;
  onSnooze?: (id: string, duration: SnoozeDuration) => void;
  exiting?: boolean;
  highlighted?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [menuLeft, setMenuLeft] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const completed = reminder.is_completed;
  const config = typeConfig[reminder.type] ?? typeConfig.reminder;
  const Icon = config.icon;

  // Atualiza o tempo atual a cada minuto para verificações de snooze/atrasado
  useEffect(() => {
    const interval = setInterval(() => setNow(() => Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Ao abrir um lembrete atrasado, rola até ele no mês correspondente
  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  // Calcula posição do menu dropdown para não sair da tela
  const calculateMenuPosition = useCallback(() => {
    if (!menuButtonRef.current || !menuRef.current) return;

    const buttonRect = menuButtonRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Posição padrão: à direita do botão, abaixo dele
    let top: string | number = buttonRect.bottom + 4;
    let left = buttonRect.right - menuRect.width;
    let bottom: string | number = 'auto';

    // Se não couber à direita, alinha à esquerda do botão
    if (left < 8) {
      left = buttonRect.left;
    }

    // Se não couber abaixo, abre para cima
    if (top + menuRect.height > viewportHeight - 8) {
      top = 'auto';
      bottom = viewportHeight - buttonRect.top + 4;
    }

    // Garante que não saia da tela horizontalmente
    if (left + menuRect.width > viewportWidth - 8) {
      left = viewportWidth - menuRect.width - 8;
    }
    if (left < 8) {
      left = 8;
    }

    // Salva a posição horizontal calculada
    setMenuLeft(left);
    setMenuStyle({ top, left, bottom });
  }, []);

  // Atualiza apenas a posição vertical durante o scroll
  const updateMenuVertical = useCallback(() => {
    if (!menuButtonRef.current || !menuRef.current || menuLeft === null) return;

    const buttonRect = menuButtonRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    let top: string | number = buttonRect.bottom + 4;
    let bottom: string | number = 'auto';

    // Se não couber abaixo, abre para cima
    if (top + menuRect.height > viewportHeight - 8) {
      top = 'auto';
      bottom = viewportHeight - buttonRect.top + 4;
    }

    setMenuStyle(prev => ({ ...prev, top, bottom }));
  }, [menuLeft]);

  // Atualiza posição do menu ao abrir e durante scroll
  useEffect(() => {
    if (!menuOpen) return;

    calculateMenuPosition();

    const handleScroll = () => updateMenuVertical();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuOpen, calculateMenuPosition, updateMenuVertical]);

  // Reseta menuLeft quando o menu fecha
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!menuOpen) {
      setMenuLeft(null);
    }
  }, [menuOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isOverdue =
    reminder.due_date &&
    reminder.due_date < new Date(now).toISOString().slice(0, 10) &&
    !reminder.is_completed &&
    !reminder.archived_at &&
    !reminder.skipped_dates?.includes(reminder.due_date.slice(0, 10));
  const isSnoozedActive = Boolean(
    reminder.snoozed_until && !completed && new Date(reminder.snoozed_until).getTime() > now
  );

  return (
    <div
      ref={cardRef}
      className={`group relative flex items-start gap-2 border-2 p-3 transition-all ${
        exiting ? 'animate-slide-down' : 'animate-slide-up'
      } ${
        completed
          ? 'border-zinc-300 bg-white opacity-70'
          : isOverdue
            ? 'border-red-500 bg-red-50'
            : 'border-black bg-white shadow-[4px_4px_0_0_#000]'
      } ${highlighted ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-[#fef3c7]' : ''}`}
    >
      <button
        onClick={() => onToggle(reminder.id, !completed)}
        aria-label={completed ? 'Reabrir lembrete' : 'Concluir lembrete'}
        title={completed ? 'Reabrir' : 'Concluir'}
        className="group/check -my-2.5 -ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center border-2 transition-colors ${
            completed
              ? 'border-black bg-yellow-400 text-black'
              : 'border-black bg-white text-transparent group-hover/check:border-emerald-500 group-hover/check:bg-emerald-50 group-active/check:translate-x-0.5 group-active/check:translate-y-0.5'
          }`}
        >
          {completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <h3
          className={`text-sm font-semibold leading-5 text-zinc-900 ${completed ? 'line-through' : ''}`}
        >
          {reminder.title}
        </h3>

        {!completed && reminder.description && (
          <p className="mt-0.5 text-[13px] text-zinc-500 line-clamp-2">{reminder.description}</p>
        )}

        <div className={`flex flex-wrap items-center gap-1.5 ${completed ? 'mt-1' : 'mt-1.5'}`}>
          <span
            className={`inline-flex h-6 w-6 items-center justify-center border ${config.badge} ${
              completed ? 'opacity-60' : ''
            }`}
            title={config.label}
            aria-label={`Tipo: ${config.label}`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
          </span>
          {reminder.due_time && !completed && (
            <span
              className={`inline-flex h-6 w-6 items-center justify-center border ${
                isOverdue
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600'
              }`}
              title={`Horário: ${formatTime(reminder.due_time)}`}
              aria-label={`Horário: ${formatTime(reminder.due_time)}`}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
          {!completed && reminder.recurrence !== 'none' && (
            <span
              className="inline-flex h-6 w-6 items-center justify-center border border-zinc-200 bg-zinc-50 text-zinc-600"
              title={recurrenceLabels[reminder.recurrence]}
              aria-label={`Repetição: ${recurrenceLabels[reminder.recurrence]}`}
            >
              <Repeat className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
          {isSnoozedActive && (
            <span className="inline-flex h-6 items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 text-[11px] font-medium text-amber-700">
              <Bell className="h-3 w-3" aria-hidden="true" />
              Adiado
            </span>
          )}
          {typeof reminder.amount === 'number' && (
            <span className="inline-flex h-6 items-center gap-1 border border-emerald-200 bg-emerald-50 px-1.5 text-[11px] font-bold text-emerald-700">
              <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
              {reminder.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
        </div>
      </div>

      <div className="relative -my-2.5 shrink-0">
        {completed && onDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Excluir lembrete"
            title="Excluir"
            className="flex h-11 w-11 items-center justify-center text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-400 active:translate-x-0.5 active:translate-y-0.5"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        ) : (
          <>
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Mais opções"
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 active:translate-x-0.5 active:translate-y-0.5"
            >
              <EllipsisVertical className="h-5 w-5" />
            </button>
          </>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
            <div className="w-full max-w-xs border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] animate-scale-in">
              <p className="text-sm font-bold text-zinc-900">Excluir lembrete?</p>
              <p className="mt-1 text-xs text-zinc-500">
                {reminder.group_id
                  ? 'Este lembrete faz parte de uma série. Excluir só este ou todos os recorrentes? A opção "Todos" remove a série inteira, inclusive as concluídas.'
                  : 'Esta ação não pode ser desfeita.'}
              </p>
              {reminder.group_id ? (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      onDelete?.(reminder.id, 'all');
                      setConfirmDelete(false);
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 border-2 border-black bg-red-500 px-3 text-sm font-bold text-white transition-colors hover:bg-red-600 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Todos os recorrentes
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.(reminder.id, 'single');
                      setConfirmDelete(false);
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 border-2 border-black bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                    Só este
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex h-11 w-full items-center justify-center gap-2 border-2 border-transparent bg-transparent px-3 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-700"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 border-2 border-black bg-white px-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.(reminder.id, 'single');
                      setConfirmDelete(false);
                    }}
                    className="flex h-11 flex-1 items-center justify-center gap-2 border-2 border-black bg-red-500 px-3 text-sm font-bold text-white transition-colors hover:bg-red-600 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {snoozeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
            <div className="w-full max-w-xs border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] animate-scale-in">
              <p className="text-sm font-bold text-zinc-900">Adiar lembrete</p>
              <p className="mt-1 text-xs text-zinc-500">Receber a notificação novamente em:</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => {
                    onSnooze?.(reminder.id, '1h');
                    setSnoozeOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-2 border-2 border-black bg-yellow-400 px-3 text-sm font-bold text-black transition-colors active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Clock className="h-4 w-4 shrink-0" />1 hora
                  <span className="ml-auto text-xs font-semibold text-black/60">
                    {snoozeHint(reminder.due_date, reminder.due_time, '1h')}
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSnooze?.(reminder.id, 'tonight');
                    setSnoozeOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-2 border-2 border-black bg-blue-400 px-3 text-sm font-bold text-black transition-colors active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Moon className="h-4 w-4 shrink-0" />À noite
                  <span className="ml-auto text-xs font-semibold text-black/60">
                    {snoozeHint(reminder.due_date, reminder.due_time, 'tonight')}
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSnooze?.(reminder.id, 'tomorrow');
                    setSnoozeOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-2 border-2 border-black bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
                >
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  Amanhã
                  <span className="ml-auto text-xs font-semibold text-zinc-400">
                    {snoozeHint(reminder.due_date, reminder.due_time, 'tomorrow')}
                  </span>
                </button>
                <button
                  onClick={() => setSnoozeOpen(false)}
                  className="flex h-11 w-full items-center justify-center gap-2 border-2 border-transparent bg-transparent px-3 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div
              ref={menuRef}
              className="fixed z-50 w-40 overflow-hidden border-2 border-black bg-white py-1 shadow-[4px_4px_0_0_#000] animate-scale-in"
              style={menuStyle}
            >
              <Link
                href={`/edit?id=${reminder.id}`}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
                onClick={() => setMenuOpen(false)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
              {onArchive && (
                <button
                  onClick={() => {
                    onArchive(reminder.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Arquivar
                </button>
              )}
              {!completed && onSnooze && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setSnoozeOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                >
                  <Moon className="h-3.5 w-3.5" />
                  Adiar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}