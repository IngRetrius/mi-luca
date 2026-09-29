import Image from 'next/image';

import { messages } from '@miluca/i18n';

import { SignOutButton } from '@/features/auth';
import { requireSessionUser } from '@/server/session';

const t = messages.es;

export default async function HomePage() {
  const user = await requireSessionUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Image src="/icons/icon-192.png" alt="" width={96} height={96} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t.app.name}</h1>
        <p className="text-lg text-text-muted">{t.app.tagline}</p>
      </div>
      <p className="rounded-xl bg-surface p-4">{t.app.underConstruction}</p>
      {user.email && (
        <p className="text-sm text-text-muted">
          {t.auth.signedInAs.replace('{email}', user.email)}
        </p>
      )}
      <SignOutButton />
      <p className="text-sm text-text-muted">{t.scope.notInvestmentAdvice}</p>
    </main>
  );
}
