import { InsuranceScreen } from '@/features/insurance';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myInsurances');

/** Los seguros del cliente. */
export default async function MyInsurancePage() {
  const viewer = await requireClient('/mis-datos/seguros');
  return <InsuranceScreen viewer={viewer} clientId={viewer.clientId} />;
}
