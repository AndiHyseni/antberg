import wordmark from '../../assets/antberg-wordmark.png';

export function AntbergLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src={wordmark}
      alt="antberg"
      className={`h-8 w-auto max-w-[148px] object-contain object-left ${className}`}
      width={148}
      height={32}
    />
  );
}
