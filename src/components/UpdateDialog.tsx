'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { checkForUpdate, openUpdatePage, dismissUpdate } from '@/lib/autoUpdate';
import type { UpdateInfo } from '@/lib/autoUpdate';

export default function UpdateDialog() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    checkForUpdate().then((info) => {
      if (info) {
        setUpdateInfo(info);
        setVisible(true);
      }
    });
  }, []);

  const handleUpdate = async () => {
    if (!updateInfo) return;
    await openUpdatePage(updateInfo.downloadUrl);
    // Don't close dialog - user might want to update later too
  };

  const handleDismiss = () => {
    if (updateInfo) {
      dismissUpdate(updateInfo.version);
    }
    setVisible(false);
    setUpdateInfo(null);
  };

  if (!visible || !updateInfo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
    >
      <div className="w-full max-w-sm border-3 border-black bg-white p-6 shadow-[6px_6px_0_0_#000] animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-yellow-400 text-zinc-900">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h2 id="update-title" className="text-base font-extrabold text-zinc-900">
              Nova versão disponível
            </h2>
            <p className="text-sm text-zinc-500">Versão {updateInfo.version}</p>
          </div>
        </div>

        <div className="mb-4 p-3 border border-zinc-200 bg-zinc-50 rounded">
          <p className="text-sm text-zinc-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
            {updateInfo.releaseNotes}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpdate}
            className="flex h-11 w-full items-center justify-center gap-2 border-2 border-black bg-yellow-400 px-4 text-sm font-bold text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Download className="h-4 w-4" />
            Atualizar agora
          </button>

          <button
            onClick={handleDismiss}
            className="flex h-11 w-full items-center justify-center gap-2 border-2 border-transparent bg-transparent px-4 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}