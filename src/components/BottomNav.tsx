'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, CalendarDays, Settings } from 'lucide-react';

const items = [
  {
    href: '/settings',
    label: 'Ajustes',
    icon: Settings,
    size: 'normal' as const,
  },
  {
    href: '/',
    label: 'Início',
    icon: House,
    size: 'large' as const,
  },
  {
    href: '/calendar',
    label: 'Calendário',
    icon: CalendarDays,
    size: 'normal' as const,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-3 border-yellow-400 bg-black pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-3 items-center px-2 py-1">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const isLarge = item.size === 'large';

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-all active:translate-y-0.5 ${
                isActive ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={isLarge ? 'h-7 w-7' : 'h-5 w-5'} strokeWidth={isLarge ? 2.5 : 2} />
              <span
                className={`font-bold uppercase tracking-widest ${
                  isLarge ? 'text-[11px]' : 'text-[10px]'
                } ${isActive ? 'text-yellow-400' : ''}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
