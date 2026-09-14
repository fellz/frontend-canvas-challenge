export function Spinner({ small = false }: { small?: boolean }) {
  return <span className={small ? 'spinner spinner-sm' : 'spinner'} aria-hidden="true" />;
}

/** Состояние загрузки, объявленное для скринридера. */
export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      <Spinner /> {label}
    </p>
  );
}
