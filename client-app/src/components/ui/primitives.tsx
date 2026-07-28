import type { ReactNode } from 'react';

export function StatusDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-emerald-500',
    medium: 'bg-amber-500',
    low: 'bg-red-500',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[level]}`} />;
}

export function StatusPill({
  label,
  tone,
  level,
}: {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  level?: 'high' | 'medium' | 'low' | 'neutral';
}) {
  const resolvedTone =
    tone ??
    (level === 'high'
      ? 'success'
      : level === 'medium'
        ? 'warning'
        : level === 'low'
          ? 'danger'
          : 'neutral');
  const styles = {
    success: 'bg-lime/40 text-forest',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
    info: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles[resolvedTone]}`}>
      {label}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[12px] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({ value, label }: { value: string; label: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">{label}</div>
      <div className="mt-2 text-[28px] font-semibold leading-none">{value}</div>
    </Card>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className = '',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md bg-forest px-5 py-2.5 text-[12px] font-semibold tracking-wide text-white transition hover:bg-ink disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border border-border bg-white px-4 py-2 text-[12px] font-semibold text-ink hover:bg-gray-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-border text-[13px]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            'pb-3 font-medium transition-colors',
            active === t.id ? 'border-b-2 border-ink text-ink' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
