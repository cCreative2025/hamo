import type { Metadata } from 'next';
import { ReactNode } from 'react';
import '@/styles/globals.css';
import { PWAInitializer } from '@/components/PWAInitializer';

export const metadata: Metadata = {
  title: 'Hamo - 악보 협업 앱',
  description: '교회 음악팀을 위한 실시간 악보 협업 PWA 애플리케이션',
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hamo',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
      </head>
      <body className="antialiased">
        <PWAInitializer />
        {children}
      </body>
    </html>
  );
}
