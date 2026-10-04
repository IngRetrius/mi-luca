import type { Metadata } from 'next';

import { RiskProfileScreen } from '@/features/investment';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Perfil de riesgo | MiLuca' };

/** El cliente responde su perfil de riesgo. */
export default async function MyRiskProfilePage() {
  const viewer = await requireClient('/mis-datos/inversion/perfil');
  return <RiskProfileScreen viewer={viewer} clientId={viewer.clientId} />;
}
