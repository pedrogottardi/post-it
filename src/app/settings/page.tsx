'use client';

import { useState, useRef } from 'react';
import { storage } from '@/lib/storage';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { ArrowLeft, Download, Upload, Info, File, RotateCcw } from 'lucide-react';
import { forceCheckForUpdate } from '@/lib/autoUpdate';

export default function SettingsPage() {
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = storage.exportAll();
    setExportData(json);
    setShowExport(true);

    // Download automático
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-it-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importData.trim()) return;

    const result = storage.importAll(importData);
    if (result.errors > 0) {
      setImportStatus({
        type: 'error',
        message: `Importado ${result.imported} lembretes com ${result.errors} erros.`,
      });
    } else {
      setImportStatus({
        type: 'success',
        message: `${result.imported} lembretes importados com sucesso.`,
      });
    }
    setImportData('');
    setTimeout(() => setImportStatus(null), 5000);
    window.location.reload();
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(exportData);
    setImportStatus({ type: 'success', message: 'Copiado para a área de transferência!' });
    setTimeout(() => setImportStatus(null), 3000);
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportData(content);
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  }

  async function handleCheckUpdate() {
    setUpdateChecking(true);
    const info = await forceCheckForUpdate();
    setUpdateChecking(false);
    if (info) {
      if (info.isNewer) {
        setImportStatus({
          type: 'success',
          message: `Nova versão ${info.version} disponível! Toque em "Atualizar agora" no diálogo.`,
        });
      } else {
        setImportStatus({
          type: 'success',
          message: 'Você já está na versão mais recente.',
        });
      }
    } else {
      setImportStatus({
        type: 'success',
        message: 'Você já está na versão mais recente.',
      });
    }
    setTimeout(() => setImportStatus(null), 5000);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5">
      <header className="flex items-center gap-4 py-4">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white text-zinc-600 shadow-[2px_2px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-extrabold text-black">Ajustes</h1>
      </header>

      <div className="flex-1 space-y-6 pb-24">
        {/* Backup / Exportar */}
        <section className="border-2 border-black bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-zinc-700 mb-4">
            <Download className="h-4 w-4" />
            Backup e Exportação
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full min-h-[44px] border-2 border-black bg-white text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar backup (JSON)
            </button>
            <p className="text-xs text-zinc-500">
              Salva todos os seus lembretes (incluindo arquivados e séries) em um arquivo JSON.
              Guarde este arquivo para restaurar em outro dispositivo ou após reinstalar o app.
            </p>
          </div>
        </section>

        {/* Importar */}
        <section className="border-2 border-black bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-zinc-700 mb-4">
            <Upload className="h-4 w-4" />
            Importar backup
          </h2>
          <div className="space-y-3">
            <textarea
              value={importData}
              onChange={e => setImportData(e.target.value)}
              placeholder="Ou cole aqui o JSON do backup exportado..."
              rows={6}
              className="w-full resize-none border-2 border-black bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-yellow-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 border-2 border-black bg-white px-3 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap"
              >
                <File className="h-3.5 w-3.5" />
                Importar arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                onClick={handleImport}
                disabled={!importData.trim()}
                className="flex-1 min-h-[44px] border-2 border-black bg-yellow-400 text-sm font-bold text-black shadow-[4px_4px_0_0_#000] transition-colors hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Importar
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Isso substituirá ou mesclará os dados atuais. Lembretes com mesmo ID serão
              atualizados.
            </p>
          </div>
        </section>

        {/* Status do backup */}
        {showExport && (
          <section className="border-2 border-black bg-white p-4 animate-fade-in">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-zinc-700 mb-3">
              Backup gerado
            </h2>
            <div className="relative">
              <textarea
                value={exportData}
                readOnly
                rows={8}
                className="w-full resize-none border-2 border-black bg-white px-3 py-2.5 text-[11px] font-mono text-zinc-900 outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-2 min-h-[28px] border border-black bg-white px-2 py-1 text-[10px] font-bold text-zinc-600 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
              >
                Copiar
              </button>
            </div>
            <button
              onClick={() => setShowExport(false)}
              className="mt-2 w-full min-h-[44px] border-2 border-black bg-white text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
            >
              Fechar
            </button>
          </section>
        )}

        {importStatus && (
          <Toast
            key="import-toast"
            message={importStatus.message}
            onDismiss={() => setImportStatus(null)}
            duration={3000}
            tone={importStatus.type === 'success' ? 'success' : 'error'}
          />
        )}

        {/* Info */}
        <section className="border-2 border-black bg-white p-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-700 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Sobre
          </h2>
          <div className="text-sm text-zinc-600 space-y-1 pl-5 pr-2">
            <p>Post-it — Lembretes</p>
            <p>Versão 1.0.0</p>
            <p>Dados armazenados localmente no seu dispositivo.</p>
            <p className="text-zinc-400">Criado por Pedro Gottardi</p>
          </div>
          <button
            onClick={handleCheckUpdate}
            disabled={updateChecking}
            className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 border-2 border-black bg-white text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${updateChecking ? 'animate-spin' : ''}`} />
            {updateChecking ? 'Verificando...' : 'Checar atualizações'}
          </button>
        </section>
      </div>
    </div>
  );
}
