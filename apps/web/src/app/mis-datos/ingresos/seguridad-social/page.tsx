import { SocialSecurityScreen } from '@/features/incomes';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('socialSecurityMonths');

/** Meses con seguridad social del cliente. */
export default async function MySocialSecurityPage() {
  const viewer = await requireClient('/mis-datos/ingresos/seguridad-social');
  return <SocialSecurityScreen viewer={viewer} clientId={viewer.clientId} />;
}
