import { createStore } from '@/lib/storage';

/** Последнее открытое пространство — чтобы со стартовой страницы вернуться в него. */
export const lastSpace = createStore<{ id: string; title: string }>('canvas.lastSpace');
