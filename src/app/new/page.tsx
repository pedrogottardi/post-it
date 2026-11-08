'use client';

import { storage } from '@/lib/storage';
import { scheduleForReminder } from '@/lib/notifications';
import ReminderForm from '@/components/ReminderForm';
import type { ReminderFormData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewReminder() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [initialDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('date') || '';
    }
    return '';
  });

  async function handleSubmit(data: ReminderFormData) {
    setIsLoading(true);
    await storage.init();
    const reminders = storage.create(data);
    for (const reminder of reminders) {
      scheduleForReminder(reminder);
    }
    setIsLoading(false);
    router.push('/');
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
        <h1 className="text-base font-extrabold text-black flex-1 text-center">Novo lembrete</h1>
      </header>

      <div className="flex-1 pb-24">
        <ReminderForm
          initialData={
            initialDate
              ? {
                  title: '',
                  description: '',
                  type: 'reminder' as const,
                  due_date: initialDate,
                  due_time: '',
                  amount: '',
                  recurrence: 'none' as const,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
