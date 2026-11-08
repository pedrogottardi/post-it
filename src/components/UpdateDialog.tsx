'use client';

import { useState, useEffect } from 'react';
import { Download, X, Clock, Moon, CalendarDays, Trash2, AlertCircle, CheckCircle, CircleDollarSign, Repeat, Bell } from 'lucide-react';
import { getSnoozeTarget } from '@/lib/snooze';

const recurrenceLabels: Record<string, string> = {
  none: '',
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const typeConfig = {
  payment: { icon: CircleDollarSign, label: 'Pagamento', badge: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  event: { icon: CalendarDays, label: 'Evento', badge: 'border-blue-300 bg-blue-50 text-blue-700' },
  reminder: { icon: Repeat, label: 'Lembrete', badge: 'border-amber-300 bg-amber-50 text-amber-700' },
};

function formatTime(timeStr: string | null) {
  if (!timeStr) return '09:00';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

function snoozeHint(date: string | null, time: string | null, duration: '1h' | 'tonight' | 'tomorrow' | 'custom') {
  const target = getSnoozeTarget(date, time, duration);
  if (!target) return '';
  const day = target.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const hour = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
  return `${day} · ${hour}`;
}

export default function UpdateDialog({
  isOpen,
  onClose,
  version,
  releaseNotes,
  downloadUrl,
  onDownload,
}: {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  onDownload: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
      <div className="w-full max-w-sm border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] animate-scale-in">
        <p className="text-sm font-bold text-zinc-900">Nova versão disponível</p>
        <p className="mt-1 text-xs text-zinc-500">Versão {version} disponível</p>
        <div className="mt-3 p-3 border border-zinc-200 bg-zinc-50 rounded text-sm text-zinc-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {releaseNotes}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => {
              onDownload();
            }}
            className="flex h-11 w-full items-center justify-center gap-2 border-2 border-black bg-yellow-400 px-3 text-sm font-bold text-black transition-colors active:translate-x-0.5 active:translate-y-0.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar v{version}
          </button>
          <button
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center gap-2 border-2 border-transparent bg-transparent px-3 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateDialog;