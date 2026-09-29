import type { Metadata } from 'next';

import { PopupDone } from '@/features/auth';

export const metadata: Metadata = { title: 'MiLuca' };

export default async function AuthDonePage({ searchParams }: PageProps<'/auth/listo'>) {
  const { error } = await searchParams;
  return <PopupDone failed={error !== undefined} />;
}
