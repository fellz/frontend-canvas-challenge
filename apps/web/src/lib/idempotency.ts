import { createStore } from '@/lib/storage';

/**
 * Ключ идемпотентности для одной операции создания.
 * Пока повторяется та же операция (тот же `identity`) — ключ прежний: повтор после потери ответа
 * и двойное нажатие возвращают уже созданный объект. Успех или другая операция — новый ключ.
 * Хранится в sessionStorage, чтобы пережить перезагрузку вкладки во время запроса.
 */
export function createIdempotencyKey(scope: string) {
  const store = createStore<{ identity: string; key: string }>(`checkout.key.${scope}`, 'session');
  return {
    for(identity: unknown): string {
      const serialized = JSON.stringify(identity);
      const saved = store.get();
      if (saved?.identity === serialized) return saved.key;
      const key = crypto.randomUUID();
      store.set({ identity: serialized, key });
      return key;
    },
    done() {
      store.remove();
    },
  };
}
