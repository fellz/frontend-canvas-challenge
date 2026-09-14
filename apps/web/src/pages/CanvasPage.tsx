import { useQuery } from '@tanstack/react-query';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '@/api/endpoints';
import { graphQuery, spaceQuery } from '@/api/queries';
import type { Graph, NodeType } from '@/api/types';
import { EMPTY_INDEX, useGenerationIndex } from '@/features/generation/generations';
import { CanvasProvider } from '@/features/graph/CanvasContext';
import { LIMITS, NODE_TITLES, newNode, type FlowNode } from '@/features/graph/model';
import { canConnect } from '@/features/graph/rules';
import { createSaver, useSaveState, type Saver } from '@/features/graph/saver';
import { createGraphStore, useGraphState, type GraphStore } from '@/features/graph/store';
import { nodeTypes } from '@/features/nodes';
import { lastSpace } from '@/features/spaces/lastSpace';
import { Async } from '@/ui/Async';
import { Button } from '@/ui/Button';
import { ErrorNotice, messageOf } from '@/ui/Notice';
import { Spinner } from '@/ui/Spinner';

/** Пауза после последней правки перед сохранением — по заданию. */
const DEBOUNCE_MS = 500;
const NODE_TYPES: NodeType[] = ['prompt', 'generator', 'result'];

export function CanvasPage() {
  const { spaceId = '' } = useParams();
  const graph = useQuery(graphQuery(spaceId));
  const space = useQuery(spaceQuery(spaceId));
  useEffect(() => {
    if (space.data) lastSpace.set({ id: space.data.id, title: space.data.title });
  }, [space.data]);
  return (
    <Async query={graph} loading="Загружаем канвас…">
      {(loaded) => (
        <ReactFlowProvider>
          <Canvas
            key={spaceId}
            spaceId={spaceId}
            initial={loaded.data}
            etag={loaded.etag}
            title={space.data?.title ?? '…'}
          />
        </ReactFlowProvider>
      )}
    </Async>
  );
}

function Canvas({
  spaceId,
  initial,
  etag,
  title,
}: {
  spaceId: string;
  initial: Graph;
  etag: string;
  title: string;
}) {
  const [store] = useState(() => createGraphStore(initial));
  const [saver] = useState(() =>
    createSaver({
      store,
      etag,
      save: (graph, current) => api.graph.put(spaceId, graph, current),
      load: () => api.graph.get(spaceId),
      debounceMs: DEBOUNCE_MS,
    }),
  );
  // Подписка на правки живёт вместе с компонентом. Уход со страницы: несохранённое отправляем
  // сразу, таймер и подписку снимаем.
  useEffect(() => {
    const stop = saver.start();
    return () => {
      void saver.flush().catch(() => undefined);
      stop();
    };
  }, [saver]);

  const { nodes, edges, viewport } = useGraphState(store);
  const generations = useGenerationIndex(spaceId);
  const context = useMemo(
    () => ({ spaceId, saver, generations: generations.data ?? EMPTY_INDEX }),
    [spaceId, saver, generations.data],
  );
  const { getNode } = useReactFlow();
  const isValidConnection = (connection: Connection | Edge) =>
    canConnect(
      getNode(connection.source) as FlowNode | undefined,
      getNode(connection.target) as FlowNode | undefined,
      store.get().edges,
    );

  return (
    <CanvasProvider value={context}>
      <div className="canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={store.onNodesChange}
          onEdgesChange={store.onEdgesChange}
          onConnect={store.onConnect}
          isValidConnection={isValidConnection}
          defaultViewport={viewport}
          onMoveEnd={(_event, next) => store.setViewport(next)}
          minZoom={0.1}
          maxZoom={4}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background />
          <Controls />
          <Panel position="top-left" className="toolbar">
            <Link to="/" className="toolbar-back">
              ← Пространства
            </Link>
            <strong className="toolbar-title">{title}</strong>
            <AddNodeButtons store={store} />
            <span className="muted">
              Нод: {nodes.length}/{LIMITS.nodes}, связей: {edges.length}/{LIMITS.edges}
            </span>
          </Panel>
          <Panel position="top-right" className="toolbar toolbar-status">
            <SaveStatus saver={saver} store={store} />
            {generations.isError && (
              <ErrorNotice error={generations.error} onRetry={generations.refetch} />
            )}
          </Panel>
        </ReactFlow>
      </div>
    </CanvasProvider>
  );
}

function AddNodeButtons({ store }: { store: GraphStore }) {
  const { addNodes, screenToFlowPosition } = useReactFlow();
  const count = useGraphState(store).nodes.length;
  const add = (type: NodeType) => {
    // Раскладываем по три в ряд вокруг центра видимой области: цепочка «текст → генератор →
    // результат» сразу встаёт слева направо, следующие ряды — ниже.
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 + ((count % 3) - 1) * 300,
      y: window.innerHeight / 2 - 120 + Math.floor(count / 3) * 60,
    });
    addNodes(newNode(type, position));
  };
  return (
    <span className="toolbar-group" role="group" aria-label="Добавить ноду">
      {NODE_TYPES.map((type) => (
        <Button
          key={type}
          size="sm"
          variant="secondary"
          onClick={() => add(type)}
          disabled={count >= LIMITS.nodes}
        >
          + {NODE_TITLES[type]}
        </Button>
      ))}
    </span>
  );
}

/** Состояние очереди сохранений и действия при ошибке или конфликте. */
function SaveStatus({ saver, store }: { saver: Saver; store: GraphStore }) {
  const state = useSaveState(saver);
  const { setViewport } = useReactFlow();
  const [resolving, setResolving] = useState<'reload' | 'overwrite' | null>(null);
  const [resolveError, setResolveError] = useState<unknown>(null);
  const resolve = async (action: 'reload' | 'overwrite') => {
    setResolving(action);
    setResolveError(null);
    try {
      if (action === 'reload') {
        await saver.reload();
        await setViewport(store.get().viewport);
      } else await saver.overwrite();
    } catch (error) {
      setResolveError(error);
    } finally {
      setResolving(null);
    }
  };

  switch (state.kind) {
    case 'saved':
      return <span className="status status-saved">Сохранено</span>;
    case 'dirty':
      return <span className="status status-dirty">Не сохранено</span>;
    case 'saving':
      return (
        <span className="status status-saving" role="status">
          <Spinner small /> Сохраняем…
        </span>
      );
    case 'error':
      return <ErrorNotice error={state.error} onRetry={saver.retry} />;
    case 'conflict':
      return (
        <div className="conflict" role="alert">
          <p>{messageOf(state.error)} Ваши правки не сохранены и остаются на канвасе.</p>
          {resolveError !== null && <ErrorNotice error={resolveError} />}
          <div className="actions">
            <Button
              size="sm"
              onClick={() => void resolve('reload')}
              pending={resolving === 'reload'}
              disabled={resolving === 'overwrite'}
            >
              Взять версию сервера
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void resolve('overwrite')}
              pending={resolving === 'overwrite'}
              disabled={resolving === 'reload'}
            >
              Сохранить мою поверх
            </Button>
          </div>
        </div>
      );
  }
}
