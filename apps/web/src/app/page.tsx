import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { messages } from '@miluca/i18n';

import { textButton } from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import { homePath, requireViewer } from '@/server/viewer';

const t = messages.es;
// El nombre va aparte para marcarlo como no traducible.
const [greetingBefore, greetingAfter] = t.clientHome.greeting.split('{name}');

/** Inicio: cada rol va a su pantalla; el cliente ve aquí su inicio (P-C04, vacío hasta la entrega). */
export default async function HomePage() {
  const viewer = await requireViewer();
  if (viewer.role !== 'client') redirect(homePath(viewer));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Image src="/icons/icon-192.png" alt="" width={96} height={96} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-balance wrap-anywhere">
          {greetingBefore}
          <span translate="no">{viewer.displayName}</span>
          {greetingAfter}
        </h1>
        <p className="text-lg text-text-muted">{t.clientHome.preparing[viewer.formOfAddress]}</p>
      </div>
      <Link href="/privacidad-y-datos" className={`inline-flex items-center ${textButton}`}>
        {t.clientHome.privacyLink}
      </Link>
      <SignOutButton />
      <p className="text-sm text-text-muted">{t.scope.notInvestmentAdvice}</p>
    </main>
  );
}
