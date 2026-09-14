import { useSyncExternalStore } from 'react';

export type Store<T> = {
  get(): T | null;
  set(value: T): void;
  remove(): void;
  subscribe(listener: () => void): () => void;
};

/**
 * JSON-значение в Web Storage с кэшем в памяти: разбор выполняется один раз,
 * `get()` возвращает ту же ссылку, пока значение не изменилось (нужно для useSyncExternalStore).
 * Ошибки хранилища (приватный режим, переполнение) не роняют приложение.
 */
export function createStore<T>(key: string, area: () => Storage = () => localStorage): Store<T> {
  let cached: T | null | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    get() {
      if (cached === undefined) {
        try {
          const raw = area().getItem(key);
          cached = raw === null ? null : (JSON.parse(raw) as T);
        } catch {
          cached = null;
        }
      }
      return cached;
    },
    set(value) {
      cached = value;
      try {
        area().setItem(key, JSON.stringify(value));
      } catch {
        /* хранилище недоступно — работаем на кэше в памяти */
      }
      notify();
    },
    remove() {
      cached = null;
      try {
        area().removeItem(key);
      } catch {
        /* см. выше */
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Реактивное чтение значения из Store. */
export function useStore<T>(store: Store<T>): T | null {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
