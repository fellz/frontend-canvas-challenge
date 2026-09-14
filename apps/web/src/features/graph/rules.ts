import type { NodeType } from '@/api/types';
import type { FlowEdge, FlowNode } from '@/features/graph/model';

/** Куда может вести связь от ноды каждого типа. */
const NEXT: Record<NodeType, NodeType | null> = {
  prompt: 'generator',
  generator: 'result',
  result: null,
};

/**
 * Правило связей контракта: «текст → генератор», «генератор → результат», у входа одна связь,
 * у генератора один выход. Один проход по связям, без промежуточных массивов.
 */
export function canConnect(
  source: FlowNode | undefined,
  target: FlowNode | undefined,
  edges: readonly FlowEdge[],
): boolean {
  if (!source || !target || NEXT[source.type] !== target.type) return false;
  for (const edge of edges) {
    if (edge.target === target.id) return false;
    if (source.type === 'generator' && edge.source === source.id) return false;
  }
  return true;
}
