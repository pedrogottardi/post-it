import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import Providers from '@/components/Providers';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: '#facc15',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Post-it - Lembretes',
  description: 'Seus lembretes de pagamentos, eventos e tarefas sempre com você',
  manifest: '/manifest.json',
  applicationName: 'Post-it',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Post-it',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans bg-[#fef3c7] text-zinc-900">
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}