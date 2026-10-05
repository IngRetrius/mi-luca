import { ProfileScreen } from '@/features/profile';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('profile');

/** P-A04 bloque A y P-A05: perfil, tipo de cliente y supuestos del caso. */
export default async function AdvisorProfilePage({ params }: PageProps<'/clientes/[id]/perfil'>) {
  const { id } = await params;
  const path = `/clientes/${id}/perfil`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <ProfileScreen clientId={id} />;
}
