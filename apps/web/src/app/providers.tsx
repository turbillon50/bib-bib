'use client';

import { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppProviders({ children }: { children: ReactNode }) {
  const { tokens, isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken) {
      connectSocket(tokens.accessToken);
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, tokens?.accessToken]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </AppProviders>
    </QueryClientProvider>
  );
}
