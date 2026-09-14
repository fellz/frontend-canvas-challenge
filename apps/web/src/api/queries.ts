import { queryOptions } from '@tanstack/react-query';
import { api } from '@/api/endpoints';
import type { Generation } from '@/api/types';

/** Интервал опроса генерации: Retry-After у API — 1 с. */
export const POLL_INTERVAL = 1000;

export const keys = {
  spaces: ['spaces'] as const,
  space: (spaceId: string) => ['spaces', spaceId] as const,
  graph: (spaceId: string) => ['spaces', spaceId, 'graph'] as const,
  generations: (spaceId: string) => ['spaces', spaceId, 'generations'] as const,
};

export const spacesQuery = queryOptions({
  queryKey: keys.spaces,
  queryFn: ({ signal }) => api.spaces.list(signal),
});

export const spaceQuery = (spaceId: string) =>
  queryOptions({
    queryKey: keys.space(spaceId),
    queryFn: ({ signal }) => api.spaces.get(spaceId, signal),
    staleTime: Infinity,
  });

/**
 * Граф читается один раз при открытии пространства: дальше источник правды — локальное
 * состояние канваса, а сервер получает его через PUT. Перечитывание — только явное (конфликт).
 * gcTime 0: при возврате на страницу граф загружается заново.
 */
export const graphQuery = (spaceId: string) =>
  queryOptions({
    queryKey: keys.graph(spaceId),
    queryFn: ({ signal }) => api.graph.get(spaceId, signal),
    staleTime: Infinity,
    gcTime: 0,
  });

const hasProcessing = (list: Generation[] | undefined) =>
  list !== undefined && list.some((generation) => generation.status === 'processing');

/** Генерации пространства, новые первыми. Опрос идёт, только пока есть незавершённые. */
export const generationsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: keys.generations(spaceId),
    queryFn: ({ signal }) => api.generations.list(spaceId, signal),
    refetchInterval: (query) => (hasProcessing(query.state.data) ? POLL_INTERVAL : false),
  });
