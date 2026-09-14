import { Handle, Position, useNodeConnections, useNodesData, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { Scenario } from '@/api/types';
import { useStartGeneration } from '@/features/generation/generations';
import { useCanvas } from '@/features/graph/CanvasContext';
import type { GeneratorNode as GeneratorNodeType, PromptNode } from '@/features/graph/model';
import { NodeShell } from '@/features/nodes/NodeShell';
import { Button } from '@/ui/Button';
import { ErrorNotice, Notice } from '@/ui/Notice';
import { Loading } from '@/ui/Spinner';

export function GeneratorNode({ id, selected }: NodeProps<GeneratorNodeType>) {
  const { spaceId, saver, generations } = useCanvas();
  const inputs = useNodeConnections({ handleType: 'target' });
  const outputs = useNodeConnections({ handleType: 'source' });
  const prompt = useNodesData<PromptNode>(inputs[0]?.source ?? '');
  const latest = generations.byGenerator.get(id);
  const start = useStartGeneration(spaceId, saver);
  const [scenario, setScenario] = useState<Scenario>('success');

  const missing = !prompt
    ? 'Подключите ноду «Текст» ко входу'
    : !prompt.data.text.trim()
      ? 'Введите описание в ноде «Текст»'
      : outputs.length === 0
        ? 'Подключите ноду «Результат» к выходу'
        : null;
  const processing = latest?.status === 'processing';

  return (
    <NodeShell id={id} type="generator" selected={selected}>
      <Handle type="target" position={Position.Left} aria-label="Вход: текст" />
      <label className="checkbox nodrag">
        <input
          type="checkbox"
          checked={scenario === 'failure'}
          onChange={(event) => setScenario(event.target.checked ? 'failure' : 'success')}
          disabled={processing || start.isPending}
        />
        Тестовый отказ
      </label>
      <Button
        className="nodrag"
        onClick={() => start.mutate({ nodeId: id, scenario, after: latest?.id ?? null })}
        pending={start.isPending}
        disabled={missing !== null || processing}
      >
        {latest?.status === 'failed' ? 'Повторить' : 'Сгенерировать'}
      </Button>
      {missing ? (
        <p className="node-hint">{missing}</p>
      ) : processing ? (
        <Loading label="Генерируем…" />
      ) : latest?.status === 'failed' ? (
        <Notice kind="error">Генерация не удалась ({latest.failureCode}). Можно повторить.</Notice>
      ) : latest?.status === 'succeeded' ? (
        <p className="node-hint">Готово — картинка в ноде «Результат».</p>
      ) : null}
      {start.isError && <ErrorNotice error={start.error} />}
      <Handle type="source" position={Position.Right} aria-label="Выход: результат" />
    </NodeShell>
  );
}
