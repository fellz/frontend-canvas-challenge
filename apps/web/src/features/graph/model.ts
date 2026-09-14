import { Graph as GraphSchema } from '@canvas/contracts';
import type { Edge, Node } from '@xyflow/react';
import type { Graph, GraphNode, NodeType, Viewport } from '@/api/types';

export type PromptNode = Node<{ text: string }, 'prompt'>;
export type GeneratorNode = Node<{ label: string }, 'generator'>;
export type ResultNode = Node<{ label: string }, 'result'>;
export type FlowNode = PromptNode | GeneratorNode | ResultNode;
export type FlowEdge = Edge;

/** Ограничения берём из контракта, а не дублируем числом. */
export const LIMITS = {
  nodes: GraphSchema.properties.nodes.maxItems ?? Infinity,
  edges: GraphSchema.properties.edges.maxItems ?? Infinity,
};

export const NODE_TITLES: Record<NodeType, string> = {
  prompt: 'Текст',
  generator: 'Генератор',
  result: 'Результат',
};

export function newNode(type: NodeType, position: Viewport | { x: number; y: number }): FlowNode {
  const id = crypto.randomUUID();
  const at = { x: Math.round(position.x), y: Math.round(position.y) };
  return type === 'prompt'
    ? { id, type, position: at, data: { text: '' } }
    : { id, type, position: at, data: { label: NODE_TITLES[type] } };
}

/** Серверные ноды и связи структурно совместимы с React Flow — копировать нечего. */
export function fromGraph(graph: Graph) {
  return {
    nodes: graph.nodes as FlowNode[],
    edges: graph.edges as FlowEdge[],
    viewport: graph.viewport,
  };
}

/**
 * Постоянная часть графа для PUT: только поля из контракта. Служебные поля React Flow
 * (`selected`, `dragging`, `measured`, …) отбрасываются. Один проход по нодам и один по связям;
 * `map` даёт плотные массивы (в отличие от `new Array(n)` — тот создаёт массив с дырками).
 */
export function toGraph(state: {
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  viewport: Viewport;
}): Graph {
  const { x, y, zoom } = state.viewport;
  return {
    nodes: state.nodes.map(
      ({ id, type, position, data }) =>
        ({ id, type, position: { x: position.x, y: position.y }, data }) as GraphNode,
    ),
    edges: state.edges.map(({ id, source, target }) => ({ id, source, target })),
    viewport: { x, y, zoom },
  };
}
