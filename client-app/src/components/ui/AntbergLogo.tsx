export function AntbergLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 14c1.5-1 2.5-1 5 0s3.5 1 5 0M4 10l2 2M18 10l-2 2M8 6l-1-2M14 6l1-2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[17px] font-bold tracking-tight lowercase">antberg</span>
    </div>
  );
}
