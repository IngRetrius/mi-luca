import { redirect } from 'next/navigation';

import { ClientHome } from '@/features/client-home';
import { LandingPage, landingMetadata } from '@/features/landing';
import { getViewer, homePath } from '@/server/viewer';

export const generateMetadata = landingMetadata;

/**
 * La raíz (ADR 0026): sin sesión, el landing público (P-G06); con sesión, cada rol sigue a su
 * inicio como antes: el cliente ve aquí el suyo (P-C04) y los demás van a su pantalla.
 */
export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) return <LandingPage />;
  if (viewer.role !== 'client') redirect(homePath(viewer));
  return <ClientHome viewer={viewer} />;
}
