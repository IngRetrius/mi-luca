import type { Metadata } from 'next';

import { SocialSecurityScreen } from '@/features/incomes';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Meses con seguridad social | MiLuca' };

/** Meses con seguridad social del cliente. */
export default async function MySocialSecurityPage() {
  const viewer = await requireClient('/mis-datos/ingresos/seguridad-social');
  return <SocialSecurityScreen viewer={viewer} clientId={viewer.clientId} />;
}
