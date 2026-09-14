import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { PromptNode as PromptNodeType } from '@/features/graph/model';
import { NodeShell } from '@/features/nodes/NodeShell';

export function PromptNode({ id, data, selected }: NodeProps<PromptNodeType>) {
  const { updateNodeData } = useReactFlow();
  const fieldId = `prompt-${id}`;
  return (
    <NodeShell id={id} type="prompt" selected={selected}>
      <label htmlFor={fieldId}>Описание изображения</label>
      <textarea
        id={fieldId}
        className="nodrag nowheel"
        rows={4}
        maxLength={2000}
        placeholder="Горы на рассвете"
        value={data.text}
        onChange={(event) => updateNodeData(id, { text: event.target.value })}
      />
      <Handle type="source" position={Position.Right} aria-label="Выход: текст" />
    </NodeShell>
  );
}
