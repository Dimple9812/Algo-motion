import { Link } from 'react-router-dom';
import { useBookmarks, useToggleBookmark } from '@/api/hooks';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '@/components/ui';
import { difficultyTone } from '../Problems';

export default function Bookmarks() {
  const { data, isLoading, error } = useBookmarks();
  const toggle = useToggleBookmark();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Bookmarks</h1>
      {isLoading && <Spinner />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.length === 0 && (
        <EmptyState title="No bookmarks yet.">
          <p className="mt-1">
            Star problems in the{' '}
            <Link className="text-sky-300 underline" to="/problems">
              catalog
            </Link>
            .
          </p>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <Card>
          <ul className="divide-y divide-ink-800">
            {data.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 py-2">
                <Link to={`/problems/${p.slug}`} className="flex-1 hover:text-sky-300">
                  {p.title}
                </Link>
                <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty.toLowerCase()}</Badge>
                <button
                  aria-label={`Remove bookmark for ${p.title}`}
                  onClick={() => toggle.mutate({ slug: p.slug, on: false })}
                >
                  ★
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
