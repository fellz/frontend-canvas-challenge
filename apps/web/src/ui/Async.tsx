import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Loading } from '@/ui/Spinner';
import { ErrorNotice } from '@/ui/Notice';

/**
 * Единое отображение состояний запроса: загрузка, ошибка с повтором, данные.
 * Если данные уже были, а обновление не удалось — показываем и ошибку, и данные.
 */
export function Async<T>({
  query,
  loading,
  children,
}: {
  query: UseQueryResult<T>;
  loading?: string;
  children: (data: T) => ReactNode;
}) {
  if (query.data === undefined)
    return query.isError ? (
      <ErrorNotice error={query.error} onRetry={query.refetch} pending={query.isFetching} />
    ) : (
      <Loading label={loading} />
    );
  return (
    <>
      {query.isError && (
        <ErrorNotice error={query.error} onRetry={query.refetch} pending={query.isFetching} />
      )}
      {children(query.data)}
    </>
  );
}
