'use client';

import { useState } from 'react';
import { ArrowLeft, Download, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { forceCheckForUpdate } from '@/lib/autoUpdate';
import Toast from '@/components/Toast';

export default function SettingsPage() {
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const result = await forceCheckForUpdate();
      if (result) {
        setToast({ message: `Nova versão ${result.version} disponível!`, type: 'success' });
      } else {
        setToast({ message: 'Você já está na versão mais recente.', type: 'success' });
      }
    } catch {
      setToast({ message: 'Erro ao verificar atualizações.', type: 'error' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5">
      <header className="flex items-center gap-4 py-4">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h1 className="text-base font-extrabold text-black">Configurações</h1>
      </header>

      <div className="flex-1 space-y-6 pb-24">
        {/* Atualizações */}
        <section className="border-2 border-black bg-white p-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-700 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Atualizações
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleCheckUpdate}
              disabled={checking}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 border-2 border-black bg-white text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
              </svg>
              {checking ? 'Verificando...' : 'Checar atualizações'}
            </button>
            <p className="text-xs text-zinc-500 text-center">
              O app verifica automaticamente a cada 24h. Toque para forçar verificação agora.
            </p>
          </div>
        </section>

        {/* Sobre */}
        <section className="border-2 border-black bg-white p-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-700 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            Sobre
          </h2>
          <div className="text-sm text-zinc-600 space-y-1">
            <p>Post-it — Lembretes</p>
            <p>Versão 1.1.0</p>
            <p>Dados armazenados localmente no seu dispositivo.</p>
            <p className="text-zinc-400">Criado por Pedro Gottardi</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;