import type { Metadata } from 'next';

import { SpecialPocketScreen } from '@/features/pockets';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bolsillo: Meses sin ingreso | MiLuca' };

/** Banco del bolsillo de meses sin ingreso. */
export default async function MyNoIncomePocketPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/meses-sin-ingreso');
  return (
    <SpecialPocketScreen viewer={viewer} clientId={viewer.clientId} kind="meses_sin_ingreso" />
  );
}
