import { PopupDone } from '@/features/auth';
import { getMessages, pageMetadata } from '@/server/i18n';

export const generateMetadata = pageMetadata('home');

export default async function AuthDonePage({ searchParams }: PageProps<'/auth/listo'>) {
  const t = await getMessages();
  const { error } = await searchParams;
  return <PopupDone failed={error !== undefined} text={t.auth} />;
}
