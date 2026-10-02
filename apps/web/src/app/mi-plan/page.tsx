import type { Metadata } from 'next';

import { MyPlanScreen } from '@/features/deliveries';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Mi plan | MiLuca' };

/** P-C05 Mi plan. La versión elegida va en la URL (`?version=`). */
export default async function MyPlanPage({ searchParams }: PageProps<'/mi-plan'>) {
  const viewer = await requireClient('/mi-plan');
  const { version } = await searchParams;
  return (
    <MyPlanScreen
      clientId={viewer.clientId}
      formOfAddress={viewer.formOfAddress}
      version={typeof version === 'string' ? version : null}
    />
  );
}
