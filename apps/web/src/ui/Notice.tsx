import type { ReactNode } from 'react';
import { isApiError } from '@/api/http';
import { Button } from '@/ui/Button';

type Kind = 'error' | 'info' | 'success' | 'warning';

export function Notice({
  kind = 'info',
  children,
  action,
}: {
  kind?: Kind;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div className="notice-body">{children}</div>
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}

/** Текст любой ошибки для пользователя — одно место выбора сообщения. */
export function messageOf(error: unknown): string {
  if (isApiError(error)) return error.message;
  return error instanceof Error && error.message ? error.message : 'Что-то пошло не так.';
}

/** Разобранная ошибка запроса с кнопкой повтора. */
export function ErrorNotice({
  error,
  onRetry,
  retryLabel = 'Повторить',
  pending = false,
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  pending?: boolean;
}) {
  const requestId = isApiError(error) ? error.requestId : null;
  return (
    <Notice
      kind="error"
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} pending={pending}>
            {retryLabel}
          </Button>
        )
      }
    >
      {messageOf(error)}
      {requestId && <small className="muted"> Запрос {requestId.slice(0, 8)}</small>}
    </Notice>
  );
}
