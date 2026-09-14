import { Handle, Position, useNodeConnections, type NodeProps } from '@xyflow/react';
import { API_URL } from '@/api/http';
import { useCanvas } from '@/features/graph/CanvasContext';
import type { ResultNode as ResultNodeType } from '@/features/graph/model';
import { NodeShell } from '@/features/nodes/NodeShell';
import { Loading } from '@/ui/Spinner';

export function ResultNode({ id, selected }: NodeProps<ResultNodeType>) {
  const { generations } = useCanvas();
  const inputs = useNodeConnections({ handleType: 'target' });
  const latest = generations.byResult.get(id);
  // Показываем только результат генератора, который подключён сейчас: после переподключения
  // цепочки чужая или старая картинка сюда не попадает.
  const current = latest && inputs[0]?.source === latest.nodeId ? latest : undefined;

  return (
    <NodeShell id={id} type="result" selected={selected}>
      <Handle type="target" position={Position.Left} aria-label="Вход: генератор" />
      {current?.status === 'succeeded' && current.imageUrl ? (
        <figure className="result">
          <img src={API_URL + current.imageUrl} alt={current.prompt} width={240} height={160} />
          <figcaption className="node-hint">{current.prompt}</figcaption>
        </figure>
      ) : current?.status === 'processing' ? (
        <Loading label="Ждём изображение…" />
      ) : current?.status === 'failed' ? (
        <p className="node-hint">Генерация не удалась. Запустите её заново.</p>
      ) : (
        <p className="node-hint placeholder">
          {inputs.length === 0 ? 'Подключите генератор' : 'Здесь появится изображение'}
        </p>
      )}
    </NodeShell>
  );
}
