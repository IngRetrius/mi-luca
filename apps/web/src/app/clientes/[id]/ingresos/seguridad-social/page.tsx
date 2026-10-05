import { SocialSecurityScreen } from '@/features/incomes';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('socialSecurityMonths');

/** Meses con seguridad social. */
export default async function AdvisorSocialSecurityPage({
  params,
}: PageProps<'/clientes/[id]/ingresos/seguridad-social'>) {
  const { id } = await params;
  const path = `/clientes/${id}/ingresos/seguridad-social`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <SocialSecurityScreen viewer={viewer} clientId={id} />;
}
