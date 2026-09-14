import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '@/api/endpoints';
import { keys, spacesQuery } from '@/api/queries';
import { lastSpace } from '@/features/spaces/lastSpace';
import { useStore } from '@/lib/storage';
import { Async } from '@/ui/Async';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { ErrorNotice, Notice } from '@/ui/Notice';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

export function SpacesPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const spaces = useQuery(spacesQuery);
  const last = useStore(lastSpace);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | undefined>();
  const create = useMutation({
    mutationFn: api.spaces.create,
    onSuccess: (space) => {
      void client.invalidateQueries({ queryKey: keys.spaces });
      void navigate(`/spaces/${space.id}`);
    },
  });

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return setError('Введите название');
    setError(undefined);
    create.mutate(trimmed);
  };

  return (
    <section className="page">
      <h1>Рабочие пространства</h1>
      {last && (
        <Notice action={<Link to={`/spaces/${last.id}`}>Открыть</Link>}>
          Последнее пространство: {last.title}
        </Notice>
      )}
      <form className="card create-form" onSubmit={submit} noValidate>
        <Field
          id="title"
          label="Название нового пространства"
          value={title}
          maxLength={80}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(undefined);
          }}
          error={error}
        />
        {create.isError && <ErrorNotice error={create.error} />}
        <Button type="submit" pending={create.isPending}>
          Создать и открыть
        </Button>
      </form>
      <Async query={spaces} loading="Загружаем список…">
        {(list) =>
          list.length === 0 ? (
            <p className="muted">Пока нет ни одного пространства.</p>
          ) : (
            <ul className="spaces">
              {list.map((space) => (
                <li key={space.id} className="card space">
                  <Link to={`/spaces/${space.id}`}>{space.title}</Link>
                  <span className="muted">{dateFormat.format(new Date(space.createdAt))}</span>
                </li>
              ))}
            </ul>
          )
        }
      </Async>
    </section>
  );
}
