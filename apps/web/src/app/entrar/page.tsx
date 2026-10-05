import { redirect } from 'next/navigation';

import { LoginScreen, parseLoginError } from '@/features/auth';
import { safeNextPath } from '@/lib/safe-next';
import { pageMetadata } from '@/server/i18n';
import { getSessionUser } from '@/server/session';

export const generateMetadata = pageMetadata('signIn');

export default async function SignInPage({ searchParams }: PageProps<'/entrar'>) {
  // Independientes: los parámetros y la sesión se resuelven a la vez.
  const [params, user] = await Promise.all([searchParams, getSessionUser()]);
  const next = safeNextPath(params.next);
  if (user) redirect(next);
  return <LoginScreen next={next} error={parseLoginError(params.error)} />;
}
