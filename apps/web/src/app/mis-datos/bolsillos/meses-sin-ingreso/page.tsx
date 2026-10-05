import { SpecialPocketScreen } from '@/features/pockets';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('noIncomePocket');

/** Banco del bolsillo de meses sin ingreso. */
export default async function MyNoIncomePocketPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/meses-sin-ingreso');
  return (
    <SpecialPocketScreen viewer={viewer} clientId={viewer.clientId} kind="meses_sin_ingreso" />
  );
}
