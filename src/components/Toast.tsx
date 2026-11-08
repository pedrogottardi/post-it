'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Undo2 } from 'lucide-react';

type ToastTone = 'default' | 'success' | 'error';

export default function Toast({
  message,
  onUndo,
  onDismiss,
  duration = 8000,
  tone = 'default',
}: {
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
  duration?: number;
  tone?: ToastTone;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const startX = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const moved = useRef(false);

  // Fecha sozinho depois do tempo configurado
  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  function close() {
    if (closing) return;
    setClosing(true);
  }

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    dragXRef.current = 0;
    moved.current = false;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 8) moved.current = true;
    dragXRef.current = dx;
    setDragX(dx);
  }

  function handleTouchEnd() {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);

    if (Math.abs(dragXRef.current) > 70) {
      close();
    } else {
      dragXRef.current = 0;
      setDragX(0);
    }
  }

  const toneClasses =
    tone === 'success'
      ? 'border-emerald-500 bg-emerald-50'
      : tone === 'error'
        ? 'border-red-500 bg-red-50'
        : 'border-black bg-white';

  const Icon =
    tone === 'success' ? CheckCircle : tone === 'error' ? AlertCircle : onUndo ? Undo2 : null;
  const iconColor =
    tone === 'success' ? 'text-emerald-600' : tone === 'error' ? 'text-red-600' : 'text-zinc-400';

  return (
    <div
      role="alert"
      aria-live="polite"
      onClickCapture={e => {
        // Um arrasto não deve acionar "Desfazer"
        if (moved.current) {
          e.preventDefault();
          e.stopPropagation();
          moved.current = false;
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTransitionEnd={e => {
        if (closing && e.target === e.currentTarget) onDismiss();
      }}
      className={`fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-lg touch-none animate-toast-in items-center gap-3 border-2 p-3.5 shadow-[4px_4px_0_0_#000] ${toneClasses}`}
      style={{
        transform: `translateX(${closing ? (dragX >= 0 ? 120 : -120) : dragX}px)`,
        opacity: closing ? 0 : 1 - Math.min(Math.abs(dragX) / 160, 0.6),
        transition: dragging ? 'none' : 'transform 0.22s ease, opacity 0.22s ease',
      }}
    >
      {Icon && <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />}
      <p className="flex-1 text-sm font-semibold text-zinc-700">{message}</p>
      {onUndo && (
        <button
          onClick={() => {
            onUndo();
            close();
          }}
          className="shrink-0 text-sm font-extrabold text-black"
        >
          DESFAZER
        </button>
      )}
    </div>
  );
}
