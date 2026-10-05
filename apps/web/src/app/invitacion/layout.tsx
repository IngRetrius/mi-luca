import type { Metadata } from 'next';

import { pageMetadata } from '@/server/i18n';

// El enlace lleva el token de la invitación: no sale en el Referer de otros sitios ni en buscadores.
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await pageMetadata('invitation')()),
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
  };
}

export default function InvitationLayout({ children }: LayoutProps<'/invitacion'>) {
  return children;
}
