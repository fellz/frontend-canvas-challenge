import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/endpoints';
import { generationsQuery, keys } from '@/api/queries';
import type { Generation, Scenario } from '@/api/types';
import type { Saver } from '@/features/graph/saver';
import { createIdempotencyKey } from '@/lib/idempotency';

export type GenerationIndex = {
  /** Самая новая генерация каждого генератора. */
  byGenerator: ReadonlyMap<string, Generation>;
  /** Самая новая генерация для каждой ноды результата. */
  byResult: ReadonlyMap<string, Generation>;
};

export const EMPTY_INDEX: GenerationIndex = { byGenerator: new Map(), byResult: new Map() };

/**
 * Список идёт от новых к старым, поэтому первая встреченная запись для ключа — актуальная.
 * Один проход, две Map; пересчитывается только когда список изменился (select в TanStack).
 */
export function indexGenerations(list: Generation[]): GenerationIndex {
  const byGenerator = new Map<string, Generation>();
  const byResult = new Map<string, Generation>();
  for (const generation of list) {
    if (!byGenerator.has(generation.nodeId)) byGenerator.set(generation.nodeId, generation);
    if (!byResult.has(generation.resultNodeId)) byResult.set(generation.resultNodeId, generation);
  }
  return { byGenerator, byResult };
}

export function useGenerationIndex(spaceId: string) {
  return useQuery({ ...generationsQuery(spaceId), select: indexGenerations });
}

const generationKey = createIdempotencyKey('generation');

export type StartInput = {
  nodeId: string;
  scenario: Scenario;
  /** id предыдущей попытки этого генератора: новый запуск после отказа получает новый ключ. */
  after: string | null;
};

/**
 * Запуск генерации: сначала дождаться сохранения графа (включая ещё не сработавший debounce),
 * затем POST с ETag сохранённой версии. Сбой сохранения — ошибка мутации, генерация не стартует.
 */
export function useStartGeneration(spaceId: string, saver: Saver) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ nodeId, scenario, after }: StartInput) => {
      const graphETag = await saver.flush();
      const body = { nodeId, graphETag, scenario };
      return api.generations.create(spaceId, body, generationKey.for({ ...body, after }));
    },
    onSuccess: () => {
      generationKey.done();
      void client.invalidateQueries({ queryKey: keys.generations(spaceId) });
    },
  });
}
