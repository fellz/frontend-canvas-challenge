import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<'input'>, 'id'> & { id: string; label: string; error?: string };

/** Подпись, поле и ошибка, связанные через id/aria. */
export function Field({ id, label, error, ...input }: Props) {
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
