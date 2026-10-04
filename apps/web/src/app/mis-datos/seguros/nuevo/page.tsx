import type { Metadata } from 'next';

import { InsuranceFormScreen } from '@/features/insurance';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo seguro | MiLuca' };

/** Registrar un seguro (del catálogo con `?tipo=` u otro). */
export default async function MyNewInsurancePage({
  searchParams,
}: PageProps<'/mis-datos/seguros/nuevo'>) {
  const [viewer, query] = await Promise.all([
    requireClient('/mis-datos/seguros/nuevo'),
    searchParams,
  ]);
  const type = typeof query.tipo === 'string' ? query.tipo : null;
  return (
    <InsuranceFormScreen
      viewer={viewer}
      clientId={viewer.clientId}
      insuranceId={null}
      type={type}
    />
  );
}
