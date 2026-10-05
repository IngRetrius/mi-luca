import { MyPlanScreen } from '@/features/deliveries';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myPlan');

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
