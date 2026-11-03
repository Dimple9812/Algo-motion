import { SERVICE_LABELS, type ServiceName, type ServiceState } from './useBackendWake';

/** Progress panel shown while the hosted demo's sleeping backend starts up. */
export function WakeBanner({
  needs,
  services,
}: {
  needs: ServiceName[];
  services: Partial<Record<ServiceName, ServiceState>>;
}) {
  const up = needs.filter((n) => services[n] === 'UP').length;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm"
    >
      <p className="font-semibold text-sky-100">
        <span
          aria-hidden
          className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-300 border-t-transparent"
        />
        Waking up the backend… ({up}/{needs.length} ready)
      </p>
      <p className="mt-1 text-ink-300">
        The live demo runs on free hosting that sleeps after 15 minutes without visitors. Starting it usually
        takes 1–2 minutes. This page updates by itself, so there is no need to refresh.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Backend services">
        {needs.map((n) => (
          <li
            key={n}
            className={`rounded-full px-2.5 py-1 text-xs ${
              services[n] === 'UP' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-ink-800 text-ink-300'
            }`}
          >
            {services[n] === 'UP' ? '✓' : '…'} {SERVICE_LABELS[n]}{' '}
            {services[n] === 'UP' ? 'ready' : 'starting'}
          </li>
        ))}
      </ul>
    </div>
  );
}
