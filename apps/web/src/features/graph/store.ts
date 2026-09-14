import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { useSyncExternalStore } from 'react';
import type { Graph, Viewport } from '@/api/types';
import { fromGraph, type FlowEdge, type FlowNode } from '@/features/graph/model';

export type GraphState = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
  /** Растёт при каждом изменении, которое нужно сохранить. Выделение и замеры его не меняют. */
  revision: number;
};

const PERSISTENT_NODE_CHANGES: ReadonlySet<NodeChange['type']> = new Set([
  'add',
  'remove',
  'replace',
  'position',
]);
const PERSISTENT_EDGE_CHANGES: ReadonlySet<EdgeChange['type']> = new Set([
  'add',
  'remove',
  'replace',
]);

/**
 * Локальное состояние канваса — единственный источник правды после загрузки.
 * Все правки приходят через колбэки React Flow (в controlled-режиме `updateNodeData`, `addNodes`,
 * `deleteElements` тоже превращаются в onNodesChange/onEdgesChange), поэтому решение
 * «нужно ли сохранять» принимается в одном месте — по типу изменения.
 */
export function createGraphStore(initial: Graph) {
  let state: GraphState = { ...fromGraph(initial), revision: 0 };
  const listeners = new Set<() => void>();
  const commit = (patch: Partial<GraphState>, persistent: boolean) => {
    state = { ...state, ...patch, revision: persistent ? state.revision + 1 : state.revision };
    listeners.forEach((listener) => listener());
  };
  return {
    get: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onNodesChange(changes: NodeChange<FlowNode>[]) {
      commit(
        { nodes: applyNodeChanges(changes, state.nodes) },
        changes.some((change) => PERSISTENT_NODE_CHANGES.has(change.type)),
      );
    },
    onEdgesChange(changes: EdgeChange<FlowEdge>[]) {
      commit(
        { edges: applyEdgeChanges(changes, state.edges) },
        changes.some((change) => PERSISTENT_EDGE_CHANGES.has(change.type)),
      );
    },
    onConnect(connection: Connection) {
      commit({ edges: addEdge({ ...connection, id: crypto.randomUUID() }, state.edges) }, true);
    },
    setViewport(viewport: Viewport) {
      const current = state.viewport;
      if (current.x === viewport.x && current.y === viewport.y && current.zoom === viewport.zoom)
        return;
      commit({ viewport }, true);
    },
    /** Заменить всё серверной версией — после конфликта по решению пользователя. */
    replace(graph: Graph) {
      commit(fromGraph(graph), true);
    },
  };
}

export type GraphStore = ReturnType<typeof createGraphStore>;

export function useGraphState(store: GraphStore): GraphState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
