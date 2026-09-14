import type { ComponentProps } from 'react';
import { Spinner } from '@/ui/Spinner';

type Props = ComponentProps<'button'> & {
  /** Операция выполняется: кнопка заблокирована и показывает индикатор — защита от двойного нажатия. */
  pending?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
};

export function Button({
  pending = false,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={`btn btn-${variant} btn-${size}${className ? ` ${className}` : ''}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && <Spinner small />}
      {children}
    </button>
  );
}
