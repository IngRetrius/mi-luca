import Link from 'next/link';

import { linkButton, secondaryButton } from '@/components/ui-classes';
import { getMessages } from '@/server/i18n';

export default async function NotFound() {
  const t = (await getMessages()).common;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-balance">{t.notFoundTitle}</h1>
      <p className="text-text-muted">{t.notFoundBody}</p>
      <Link href="/" className={`${secondaryButton} ${linkButton} self-start`}>
        {t.backHome}
      </Link>
    </main>
  );
}
