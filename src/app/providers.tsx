'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReminderScheduler from '@/src/components/ReminderScheduler';

// Limpiar claves antiguas de persist que ya no se usan
const STALE_STORAGE_KEYS = [
  'bioactiva-leads-v1',
  'notification-store-v2',
  'bioactiva-lead-notifs-v1',
];

function StorageCleaner() {
  useEffect(() => {
    STALE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <StorageCleaner />
      <ReminderScheduler />
      {children}
    </QueryClientProvider>
  );
}
