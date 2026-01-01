import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { api } from '@pixli/api';

api.configure({ baseURL: process.env.API_URL || '' });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retryOnMount: false,
      retryDelay: 1000,
      retry: 1,
    },
  },
});

export const Query = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
