import { MonthlyControlScreen } from '@/features/monthly-control';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('monthlyControl');

/** P-C08 Control mensual del cliente. */
export default async function MyMonthlyControlPage({
  searchParams,
}: PageProps<'/control-mensual'>) {
  const viewer = await requireClient('/control-mensual');
  return (
    <MonthlyControlScreen
      viewer={viewer}
      clientId={viewer.clientId}
      searchParams={await searchParams}
    />
  );
}
