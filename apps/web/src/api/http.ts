export const API_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:4001').replace(
  /\/+$/,
  '',
);
/** Искусственная пауза перед каждым запросом, чтобы разглядеть состояния. 0 — выключена. */
const API_DELAY_MS = Number(import.meta.env.VITE_API_DELAY_MS ?? 0);

export type RequestSpec = {
  method?: 'GET' | 'POST' | 'PUT';
  /** Путь относительно API_URL, например `/api/spaces`. */
  path: string;
  /** Сериализуется в JSON один раз; та же строка доступна как `sentBody` в ответе. */
  body?: unknown;
  /** Дополнительные заголовки: If-Match, Idempotency-Key. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type ApiResponse<T> = {
  status: number;
  data: T;
  /** ETag графа вместе с кавычками — как его ждёт If-Match. */
  etag: string | null;
  location: string | null;
  requestId: string | null;
};

export type ErrorKind = 'network' | 'http' | 'parse' | 'aborted';

/** Единый вид любой неудачи запроса: сеть, HTTP-статус, неразборчивое тело, отмена. */
export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status: number | null;
  readonly code: string;
  readonly requestId: string | null;

  constructor(
    kind: ErrorKind,
    message: string,
    extra: { status?: number; code?: string; requestId?: string | null } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = extra.status ?? null;
    this.code = extra.code ?? kind.toUpperCase();
    this.requestId = extra.requestId ?? null;
  }

  /** Повтор того же запроса может помочь: сеть или ошибка сервера. */
  get retryable() {
    return this.kind === 'network' || (this.status !== null && this.status >= 500);
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
export const isRetryable = (error: unknown) => isApiError(error) && error.retryable;
/** Ошибка с конкретным кодом API, например `GRAPH_VERSION_CONFLICT`. */
export const hasCode = (error: unknown, ...codes: string[]) =>
  isApiError(error) && codes.includes(error.code);

const STATUS_MESSAGES: Record<number, string> = {
  404: 'Данные не найдены.',
  409: 'Данные изменились. Обновите страницу и повторите.',
  412: 'Граф изменился на сервере.',
  500: 'Ошибка сервера. Попробуйте ещё раз.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const errorOf = (body: unknown): { code?: string; message?: string } | undefined =>
  isRecord(body) && isRecord(body.error) ? body.error : undefined;

async function send(spec: RequestSpec): Promise<Response> {
  const headers = new Headers(spec.headers);
  headers.set('Accept', 'application/json');
  if (spec.body !== undefined) headers.set('Content-Type', 'application/json');
  if (API_DELAY_MS > 0) await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS));
  try {
    return await fetch(API_URL + spec.path, {
      method: spec.method ?? 'GET',
      headers,
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      signal: spec.signal,
    });
  } catch {
    if (spec.signal?.aborted) throw new ApiError('aborted', 'Запрос отменён.');
    throw new ApiError('network', 'Нет связи с сервером. Проверьте сеть и повторите.');
  }
}

async function parse<T>(response: Response): Promise<ApiResponse<T>> {
  const { status } = response;
  const requestId = response.headers.get('X-Request-Id');
  let text: string;
  try {
    text = status === 204 || status === 304 ? '' : await response.text();
  } catch {
    throw new ApiError('network', 'Соединение прервано при получении ответа.', { requestId });
  }
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError('parse', 'Сервер вернул нечитаемый ответ.', { status, requestId });
    }
  }
  if (!response.ok) {
    const error = errorOf(body);
    throw new ApiError('http', error?.message ?? STATUS_MESSAGES[status] ?? `Ошибка ${status}.`, {
      status,
      code: error?.code ?? `HTTP_${status}`,
      requestId,
    });
  }
  return {
    status,
    data: body as T,
    etag: response.headers.get('ETag'),
    location: response.headers.get('Location'),
    requestId,
  };
}

/**
 * Единственная точка отправки запросов: адрес, заголовки, тело, статус, пустой ответ,
 * разбор тела и приведение ошибок к ApiError. Ответы API без обёртки — `data` это само тело.
 */
export const request = async <T>(spec: RequestSpec): Promise<ApiResponse<T>> =>
  parse<T>(await send(spec));

/** То же, что request, но только тело — для вызовов, которым не нужны заголовки. */
export const data = <T>(spec: RequestSpec) => request<T>(spec).then((response) => response.data);
