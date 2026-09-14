import { useSyncExternalStore } from 'react';
import { ApiError, type ApiResponse } from '@/api/http';

type GraphResponse = ApiResponse<Graph> & { etag: string };
import type { Graph } from '@/api/types';
import { toGraph } from '@/features/graph/model';
import type { GraphStore } from '@/features/graph/store';

export type SaveState =
  | { kind: 'saved' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'error'; error: ApiError }
  | { kind: 'conflict'; error: ApiError };

type Options = {
  store: GraphStore;
  /** ETag графа, полученного при открытии. */
  etag: string;
  save: (graph: Graph, etag: string) => Promise<GraphResponse>;
  load: () => Promise<GraphResponse>;
  debounceMs: number;
};

const conflictError = () =>
  new ApiError('http', 'Граф изменился на сервере.', {
    status: 412,
    code: 'GRAPH_VERSION_CONFLICT',
  });

/**
 * Очередь сохранений графа.
 * - Любая правка → таймер debounce; серия правок даёт один PUT после паузы.
 * - PUT выполняются строго по одному: правки, пришедшие во время запроса, уходят следующим PUT
 *   уже с новым ETag. Ответ никогда не пишется в локальное состояние — берётся только ETag.
 * - `flush()` отправляет несохранённое сразу и ждёт, пока сервер не получит текущую ревизию.
 * - Следить за правками начинает `start()`; до него правки только копятся в store.
 * - 412 → `conflict`: локальные правки остаются, пользователь выбирает версию.
 * - Потеря ответа → сверяем с сервером, дошёл ли PUT, прежде чем повторять.
 */
export function createSaver({ store, etag: initialEtag, save, load, debounceMs }: Options) {
  let etag = initialEtag;
  let savedRevision = store.get().revision;
  let state: SaveState = { kind: 'saved' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const setState = (next: SaveState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const dirty = () => store.get().revision !== savedRevision;

  const onChange = () => {
    if (!dirty() || state.kind === 'conflict') return;
    if (state.kind !== 'saving') setState({ kind: 'dirty' });
    clearTimeout(timer);
    timer = setTimeout(() => void run(), debounceMs);
  };

  /** Ответ PUT потерялся: узнаём у сервера, дошёл ли он. */
  async function recover(sent: Graph): Promise<'saved' | 'retry' | 'conflict'> {
    let server: GraphResponse;
    try {
      server = await load();
    } catch {
      return 'retry';
    }
    if (server.etag === etag) return 'retry';
    if (JSON.stringify(server.data) === JSON.stringify(sent)) {
      etag = server.etag;
      return 'saved';
    }
    return 'conflict';
  }

  async function loop() {
    while (dirty() && state.kind !== 'conflict') {
      const snapshot = store.get();
      const graph = toGraph(snapshot);
      setState({ kind: 'saving' });
      try {
        etag = (await save(graph, etag)).etag;
        savedRevision = snapshot.revision;
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        if (error.status === 412) return setState({ kind: 'conflict', error });
        if (error.kind !== 'network') return setState({ kind: 'error', error });
        const outcome = await recover(graph);
        if (outcome === 'conflict') return setState({ kind: 'conflict', error: conflictError() });
        if (outcome === 'retry') return setState({ kind: 'error', error });
        savedRevision = snapshot.revision;
      }
    }
    if (state.kind !== 'conflict') setState({ kind: 'saved' });
  }

  function run(): Promise<void> {
    clearTimeout(timer);
    running ??= loop().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Сохранить всё несохранённое сейчас; вернуть ETag сохранённой версии или бросить ошибку. */
    async flush(): Promise<string> {
      await run();
      if (state.kind === 'error' || state.kind === 'conflict') throw state.error;
      if (state.kind !== 'saved') throw new Error('Граф не сохранён.');
      return etag;
    },
    retry: () => void run(),
    /** Взять версию сервера, отбросив локальные правки. */
    async reload() {
      const server = await load();
      store.replace(server.data);
      clearTimeout(timer);
      etag = server.etag;
      savedRevision = store.get().revision;
      setState({ kind: 'saved' });
    },
    /** Сохранить локальную версию поверх серверной. */
    async overwrite() {
      etag = (await load()).etag;
      setState({ kind: 'dirty' });
      await run();
    },
    /**
     * Начать следить за правками. Побочный эффект вынесен из конструктора, чтобы создание
     * в useState было чистым (StrictMode вызывает инициализатор дважды), а подписка жила в useEffect.
     */
    start() {
      const unsubscribe = store.subscribe(onChange);
      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    },
  };
}

export type Saver = ReturnType<typeof createSaver>;

export function useSaveState(saver: Saver): SaveState {
  return useSyncExternalStore(saver.subscribe, saver.getState, saver.getState);
}
