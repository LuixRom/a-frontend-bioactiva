import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';
import { Providers } from '@/src/app/providers';
import AppShell from '@/src/components/AppShell';
import { ToastProvider } from '@/src/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Bioactiva CRM',
  description: 'CRM para gestión comercial y seguimiento de leads de Bioactiva',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <ToastProvider>
            <AppShell>
              {children}
            </AppShell>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
