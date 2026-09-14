import type { NodeTypes } from '@xyflow/react';
import { GeneratorNode } from '@/features/nodes/GeneratorNode';
import { PromptNode } from '@/features/nodes/PromptNode';
import { ResultNode } from '@/features/nodes/ResultNode';

/** Константа на уровне модуля: React Flow требует стабильную ссылку. */
export const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  generator: GeneratorNode,
  result: ResultNode,
};
