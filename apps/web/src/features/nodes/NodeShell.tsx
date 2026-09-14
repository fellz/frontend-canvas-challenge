import { useReactFlow } from '@xyflow/react';
import type { ReactNode } from 'react';
import type { NodeType } from '@/api/types';
import { NODE_TITLES } from '@/features/graph/model';

/** Общая рамка ноды: заголовок, кнопка удаления (удаляет и связи), содержимое. */
export function NodeShell({
  id,
  type,
  selected,
  children,
}: {
  id: string;
  type: NodeType;
  selected?: boolean;
  children: ReactNode;
}) {
  const { deleteElements } = useReactFlow();
  return (
    <div className={`node node-${type}${selected ? ' node-selected' : ''}`}>
      <div className="node-header">
        <span className="node-title">{NODE_TITLES[type]}</span>
        <button
          type="button"
          className="node-remove nodrag"
          aria-label={`Удалить ноду «${NODE_TITLES[type]}»`}
          title="Удалить"
          onClick={() => void deleteElements({ nodes: [{ id }] })}
        >
          ×
        </button>
      </div>
      <div className="node-body">{children}</div>
    </div>
  );
}
