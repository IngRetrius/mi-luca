import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { messages } from '@miluca/i18n';

import { linkButton, primaryButton, textButton } from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import { listDeliveries } from '@/features/deliveries';
import { homePath, requireViewer } from '@/server/viewer';

const t = messages.es;
// El nombre va aparte para marcarlo como no traducible.
const [greetingBefore, greetingAfter] = t.clientHome.greeting.split('{name}');

/**
 * Inicio: cada rol va a su pantalla; el cliente ve aquí su inicio (P-C04). Hasta la entrega dice
 * que el asesor prepara el plan; después lleva a Mi plan.
 */
export default async function HomePage() {
  const viewer = await requireViewer();
  if (viewer.role !== 'client') redirect(homePath(viewer));
  const deliveries = await listDeliveries(viewer.clientId);
  const delivered = (deliveries?.length ?? 0) > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Image src="/icons/icon-192.png" alt="" width={96} height={96} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-balance wrap-anywhere">
          {greetingBefore}
          <span translate="no">{viewer.displayName}</span>
          {greetingAfter}
        </h1>
        <p className="text-lg text-text-muted">
          {delivered
            ? t.myPlan.ready[viewer.formOfAddress]
            : t.clientHome.preparing[viewer.formOfAddress]}
        </p>
      </div>
      {delivered ? (
        <Link href="/mi-plan" className={`w-full ${primaryButton} ${linkButton}`}>
          {t.myPlan.link[viewer.formOfAddress]}
        </Link>
      ) : null}
      <Link href="/mis-datos" className={`inline-flex items-center ${textButton}`}>
        {t.myData.link}
      </Link>
      <Link href="/privacidad-y-datos" className={`inline-flex items-center ${textButton}`}>
        {t.clientHome.privacyLink}
      </Link>
      <SignOutButton />
      <p className="text-sm text-text-muted">{t.scope.notInvestmentAdvice}</p>
    </main>
  );
}
