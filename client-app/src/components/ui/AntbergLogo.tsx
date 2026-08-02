import logo from '../../assets/antberg_logo.svg';

export function AntbergLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="antberg"
      className={`h-[26px] w-auto max-w-[122px] object-contain object-left ${className}`}
      width={122}
      height={26}
    />
  );
}
