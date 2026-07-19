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
  level,
}: {
  label: string;
  level: 'high' | 'medium' | 'low' | 'neutral';
}) {
  const styles = {
    high: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${styles[level]}`}>
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
      className={`rounded-md bg-ink px-5 py-2.5 text-[12px] font-semibold tracking-wide text-white transition hover:bg-black disabled:opacity-50 ${className}`}
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
