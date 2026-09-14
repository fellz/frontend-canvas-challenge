import { QueryClient } from '@tanstack/react-query';
import { ApiError, isRetryable } from '@/api/http';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

/** Повторы только для сетевых ошибок и 5xx — одно правило для всех запросов и мутаций. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
