import { RiskProfileScreen } from '@/features/investment';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('riskProfile');

/** El cliente responde su perfil de riesgo. */
export default async function MyRiskProfilePage() {
  const viewer = await requireClient('/mis-datos/inversion/perfil');
  return <RiskProfileScreen viewer={viewer} clientId={viewer.clientId} />;
}
