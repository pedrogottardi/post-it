'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

type ToastTone = 'success' | 'error';

export default function Toast({
  message,
  onDismiss,
  duration = 4000,
  tone = 'success',
}: {
  message: string;
  onDismiss: () => void;
  duration?: number;
  tone?: ToastTone;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  function close() {
    if (closing) return;
    setClosing(true);
  }

  const toneClasses =
    tone === 'success'
      ? 'border-emerald-500 bg-emerald-50'
      : tone === 'error'
        ? 'border-red-500 bg-red-50'
        : 'border-black bg-white';

  const Icon = tone === 'success' ? CheckCircle : AlertCircle;
  const iconColor = tone === 'success' ? 'text-emerald-600' : 'text-red-600';

  return (
    <div
      role="alert"
      aria-live="polite"
      onTransitionEnd={(e) => {
        if (closing && e.target === e.currentTarget) onDismiss();
      }}
      className={`fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-lg animate-toast-in items-center gap-3 border-2 p-3.5 shadow-[4px_4px_0_0_#000] ${toneClasses}`}
      style={{
        transform: `translateY(${closing ? 120 : 0}px)`,
        opacity: closing ? 0 : 1,
        transition: 'transform 0.22s ease, opacity 0.22s ease',
      }}
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <p className="flex-1 text-sm font-semibold text-zinc-700">{message}</p>
      <button onClick={close} className="shrink-0 text-sm font-extrabold text-black">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}