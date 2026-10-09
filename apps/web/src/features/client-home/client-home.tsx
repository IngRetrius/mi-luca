import Image from 'next/image';
import Link from 'next/link';

import { linkButton, primaryButton, secondaryButton, textButton } from '@/components/ui-classes';
import { loadActionItems, NextTasks, pendingTasks } from '@/features/action-plan';
import { SignOutButton } from '@/features/auth';
import { IndicatorSummary, loadLatestDelivery } from '@/features/deliveries';
import { loadDocuments } from '@/features/documents';
import { LanguageSwitcher } from '@/features/language';
import { withAddress } from '@/lib/address';
import { getLocale, getMessages } from '@/server/i18n';
import type { Viewer } from '@/server/viewer';

/**
 * P-C04 Inicio del cliente. Hasta la entrega dice que el asesor prepara el plan; después lleva a Mi
 * plan. Siempre puede registrar el gasto del mes y, si el asesor agregó tareas, ve las próximas.
 */
export async function ClientHome({ viewer }: { viewer: Extract<Viewer, { role: 'client' }> }) {
  const t = await getMessages();
  // El nombre va aparte para marcarlo como no traducible.
  const [greetingBefore, greetingAfter] = t.clientHome.greeting.split('{name}');
  const [latest, actionItems, documents, locale] = await Promise.all([
    loadLatestDelivery(viewer.clientId),
    loadActionItems(viewer.clientId),
    loadDocuments(viewer.clientId),
    getLocale(viewer.countryCode),
  ]);
  const delivered = Boolean(latest);
  // RLS: el cliente solo recibe las notas publicadas.
  const notesPublished = documents?.notas !== undefined;
  const nextTasks = pendingTasks(actionItems);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Image src="/icons/icon-192.png" alt="" width={96} height={96} priority unoptimized />
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
      ) : notesPublished ? (
        <Link href="/mi-plan" className={`w-full ${primaryButton} ${linkButton}`}>
          {t.documents.view.notesTitle[viewer.formOfAddress]}
        </Link>
      ) : null}
      <Link href="/control-mensual" className={`w-full ${secondaryButton} ${linkButton}`}>
        {t.clientHome.spendingLink}
      </Link>
      {latest ? (
        <IndicatorSummary
          delivery={latest}
          locale={locale}
          title={withAddress(t.clientHome, viewer.formOfAddress).indicatorsTitle}
        />
      ) : null}
      {nextTasks.length > 0 ? (
        <NextTasks
          tasks={nextTasks}
          formOfAddress={viewer.formOfAddress}
          countryCode={viewer.countryCode}
        />
      ) : null}
      <Link href="/mis-datos" className={`inline-flex items-center ${textButton}`}>
        {t.myData.link}
      </Link>
      <Link href="/privacidad-y-datos" className={`inline-flex items-center ${textButton}`}>
        {t.clientHome.privacyLink}
      </Link>
      <SignOutButton />
      <LanguageSwitcher className="justify-center" />
      <p className="text-sm text-text-muted">{t.scope.notInvestmentAdvice}</p>
    </main>
  );
}
