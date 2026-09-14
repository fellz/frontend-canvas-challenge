import { ApiError, data, request, type ApiResponse } from '@/api/http';
import type { Generation, GenerationRequest, Graph, Space } from '@/api/types';

const graphPath = (spaceId: string) => `/api/spaces/${spaceId}/graph`;
type GraphResponse = ApiResponse<Graph> & { etag: string };
/** Контракт обещает ETag у графа; без него следующий PUT невозможен. */
const withEtag = (response: ApiResponse<Graph>): GraphResponse => {
  if (!response.etag) throw new ApiError('parse', 'Сервер не вернул ETag графа.');
  return { ...response, etag: response.etag };
};
const generationsPath = (spaceId: string) => `/api/spaces/${spaceId}/generations`;

/** Описание вызовов API: только путь, метод, тело и заголовки. Всё общее — в http.ts. */
export const api = {
  spaces: {
    list: (signal?: AbortSignal) => data<Space[]>({ path: '/api/spaces', signal }),
    get: (spaceId: string, signal?: AbortSignal) =>
      data<Space>({ path: `/api/spaces/${spaceId}`, signal }),
    create: (title: string) =>
      data<Space>({ method: 'POST', path: '/api/spaces', body: { title } }),
  },
  graph: {
    /** Граф вместе с ETag — он нужен для следующего PUT. */
    get: (spaceId: string, signal?: AbortSignal) =>
      request<Graph>({ path: graphPath(spaceId), signal }).then(withEtag),
    /** Полная замена графа при условии, что сервер всё ещё на версии `etag`. */
    put: (spaceId: string, graph: Graph, etag: string) =>
      request<Graph>({
        method: 'PUT',
        path: graphPath(spaceId),
        body: graph,
        headers: { 'If-Match': etag },
      }).then(withEtag),
  },
  generations: {
    list: (spaceId: string, signal?: AbortSignal) =>
      data<Generation[]>({ path: generationsPath(spaceId), signal }),
    create: (spaceId: string, body: GenerationRequest, key: string) =>
      data<Generation>({
        method: 'POST',
        path: generationsPath(spaceId),
        body,
        headers: { 'Idempotency-Key': key },
      }),
  },
};
