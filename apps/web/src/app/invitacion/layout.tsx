import type { Metadata } from 'next';

// El enlace lleva el token de la invitación: no sale en el Referer de otros sitios ni en buscadores.
export const metadata: Metadata = {
  title: 'Invitación | MiLuca',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function InvitationLayout({ children }: LayoutProps<'/invitacion'>) {
  return children;
}
