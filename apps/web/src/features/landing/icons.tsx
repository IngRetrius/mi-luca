import type { ReactNode } from 'react';

/**
 * Iconos de trazo simple de las páginas públicas, en SVG en línea: decorativos (el texto de al lado
 * dice lo mismo), heredan el color del texto y miden 20 px salvo que se indique otra clase.
 */
function Icon({
  children,
  className = 'size-5',
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string | undefined };

export const ChatIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M8 16H5.5A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H12l-4 4z" />
  </Icon>
);

export const MailIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </Icon>
);

export const CalendarIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const LockIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const PeopleIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14a4.5 4.5 0 0 1 4.5 5" />
  </Icon>
);

export const ShieldIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
  </Icon>
);

export const BriefcaseIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3.5" y="7" width="17" height="13" rx="2" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 13h17" />
  </Icon>
);

export const CheckIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
