import clsx from 'clsx';
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { create } from 'zustand';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        variant === 'primary' && 'bg-sky-400 text-ink-950 hover:bg-sky-300',
        variant === 'secondary' && 'border border-ink-600 bg-ink-800 text-slate-100 hover:bg-ink-700',
        variant === 'ghost' && 'text-slate-200 hover:bg-ink-800',
        variant === 'danger' && 'bg-rose-500 text-white hover:bg-rose-400',
        className,
      )}
    />
  );
}

export function Card({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={clsx('rounded-2xl border border-ink-700 bg-ink-900/80 p-4 backdrop-blur', className)}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'easy' | 'medium' | 'hard' | 'info' | 'success' | 'warn' | 'error';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-700 text-slate-200',
    easy: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    hard: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    warn: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30',
    error: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-300">
      <span
        className="spin inline-block h-4 w-4 rounded-full border-2 border-sky-400 border-t-transparent"
        aria-hidden
      />
      {label}
    </span>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-rose-200/90">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-600 p-8 text-center text-sm text-ink-300">
      <p className="font-semibold text-slate-200">{title}</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Tabs (WAI-ARIA tabs pattern)

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  id: string;
}
const TabsContext = createContext<TabsCtx | null>(null);

export function Tabs({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const ctx = useMemo(() => ({ value, setValue: onChange, id }), [value, onChange, id]);
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    tabs[next]?.focus();
    tabs[next]?.click();
    e.preventDefault();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={clsx('flex gap-1 overflow-x-auto rounded-xl bg-ink-850 p-1', className)}
    >
      {children}
    </div>
  );
}

export function Tab({
  value,
  children,
  disabled,
}: {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const ctx = useContext(TabsContext)!;
  const selected = ctx.value === value;
  return (
    <button
      role="tab"
      id={`${ctx.id}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${ctx.id}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => ctx.setValue(value)}
      className={clsx(
        'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        selected ? 'bg-ink-700 text-white' : 'text-ink-300 hover:text-white',
        disabled && 'opacity-40',
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.id}-panel-${value}`}
      aria-labelledby={`${ctx.id}-tab-${value}`}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Toasts

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}
export const useToasts = create<{
  toasts: Toast[];
  push: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  toasts: [],
  push: (text, tone = 'info') => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl',
            t.tone === 'success'
              ? 'border-emerald-500/40 bg-emerald-950'
              : t.tone === 'error'
                ? 'border-rose-500/40 bg-rose-950'
                : 'border-ink-600 bg-ink-800',
          )}
        >
          <span>{t.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
            className="text-ink-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Dialog

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  const close = useCallback(() => onClose(), [onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="w-full max-w-lg rounded-2xl border border-ink-600 bg-ink-900 p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={id} className="font-display text-lg font-bold">
            {title}
          </h2>
          <button
            autoFocus
            aria-label="Close dialog"
            onClick={close}
            className="rounded p-1 text-ink-300 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      aria-describedby={show ? id : undefined}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-700 px-2 py-1 text-xs text-white shadow"
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string | null;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = error || hint ? hintId : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })
    : children;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="font-medium text-slate-200">
        {label}
      </label>
      {control}
      {hint && !error && (
        <span id={hintId} className="text-xs text-ink-400">
          {hint}
        </span>
      )}
      {error && (
        <span id={hintId} className="text-xs text-rose-300" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export const inputClass =
  'h-10 rounded-lg border border-ink-600 bg-ink-850 px-3 text-sm text-slate-100 placeholder:text-ink-400 focus:border-sky-400 focus:outline-none';
