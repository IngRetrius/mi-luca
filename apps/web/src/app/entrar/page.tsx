import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginScreen, parseLoginError } from '@/features/auth';
import { safeNextPath } from '@/lib/safe-next';
import { getSessionUser } from '@/server/session';

export const metadata: Metadata = { title: 'Entrar | MiLuca' };

export default async function SignInPage({ searchParams }: PageProps<'/entrar'>) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getSessionUser()) redirect(next);
  return <LoginScreen next={next} error={parseLoginError(params.error)} />;
}
