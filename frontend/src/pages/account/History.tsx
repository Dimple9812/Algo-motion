import { Link } from 'react-router-dom';
import { useHistory } from '@/api/hooks';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '@/components/ui';

export default function History() {
  const { data, isLoading, error } = useHistory();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">History</h1>
      {isLoading && <Spinner />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.length === 0 && (
        <EmptyState title="No saved sessions yet.">
          <p className="mt-1">Use “Save session” in the visualizer or the AI solver.</p>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <Card>
          <ul className="divide-y divide-ink-800" data-testid="history-list">
            {data.map((s) => {
              const p = s.payload as {
                category?: string;
                algorithm?: string;
                input?: Record<string, unknown>;
                solutionId?: string;
              };
              const to =
                s.type === 'SOLUTION'
                  ? `/solve/${p.solutionId}`
                  : `/visualizer/${p.category}?algo=${p.algorithm}`;
              return (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <Badge tone={s.type === 'SOLUTION' ? 'info' : 'neutral'}>{s.type.toLowerCase()}</Badge>
                  <Link to={to} className="flex-1 hover:text-sky-300">
                    {s.title}
                  </Link>
                  <span className="text-xs text-ink-400">{new Date(s.createdAt).toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
