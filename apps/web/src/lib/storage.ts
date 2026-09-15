import { useSyncExternalStore } from 'react';

export type Store<T> = {
  get(): T | null;
  set(value: T): void;
  remove(): void;
  subscribe(listener: () => void): () => void;
};

export type StorageArea = 'local' | 'session';

/**
 * JSON-значение в Web Storage с кэшем в памяти: разбор выполняется один раз,
 * `get()` возвращает ту же ссылку, пока значение не изменилось (нужно для useSyncExternalStore).
 * Ошибки хранилища (приватный режим, переполнение) не роняют приложение.
 * `session` — только для этой вкладки (например, ключи идемпотентности), `local` — общее.
 */
export function createStore<T>(key: string, area: StorageArea = 'local'): Store<T> {
  let cached: T | null | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  // Обращение к хранилищу откладываем до первого использования: при импорте модуля оно может
  // быть недоступно (приватный режим, запрет cookies), а здесь каждый вызов обёрнут в try/catch.
  const storage = () => (area === 'session' ? sessionStorage : localStorage);
  return {
    get() {
      if (cached === undefined) {
        try {
          const raw = storage().getItem(key);
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
        storage().setItem(key, JSON.stringify(value));
      } catch {
        /* хранилище недоступно — работаем на кэше в памяти */
      }
      notify();
    },
    remove() {
      cached = null;
      try {
        storage().removeItem(key);
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
