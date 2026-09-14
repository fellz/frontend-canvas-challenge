import { createContext, useContext } from 'react';
import type { GenerationIndex } from '@/features/generation/generations';
import type { Saver } from '@/features/graph/saver';

export type CanvasContextValue = {
  spaceId: string;
  saver: Saver;
  generations: GenerationIndex;
};

const CanvasContext = createContext<CanvasContextValue | null>(null);
export const CanvasProvider = CanvasContext.Provider;

/** Ноды получают контекст канваса отсюда, а не через `data` — там только постоянные поля. */
export function useCanvas(): CanvasContextValue {
  const value = useContext(CanvasContext);
  if (!value) throw new Error('useCanvas вне CanvasProvider');
  return value;
}
