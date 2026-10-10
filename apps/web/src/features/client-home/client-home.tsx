import Link from 'next/link';

import { linkButton, primaryButton, secondaryButton, textButton } from '@/components/ui-classes';
import { loadActionItems, NextTasks, pendingTasks } from '@/features/action-plan';
import { SignOutButton } from '@/features/auth';
import { loadClientFiles } from '@/features/client-files';
import { IndicatorSummary, loadLatestDelivery } from '@/features/deliveries';
import { loadDocuments } from '@/features/documents';
import { InterfacePreferences } from '@/features/preferences';
import { withAddress } from '@/lib/address';
import { getLocale, getMessages } from '@/server/i18n';
import type { Viewer } from '@/server/viewer';
import { BrandMark } from '@/components/brand-mark';
import { CoinSlot } from '@/components/coin-slot';
import { NAV_FORWARD, PageTransition } from '@/components/page-transition';

/**
 * P-C04 Inicio del cliente. Hasta la entrega dice que el asesor prepara el plan; después lleva a Mi
 * plan. Antes del primer reporte, si no ha subido documentos, lo invita a subirlos para la
 * videollamada (ADR 0030). Siempre puede registrar el gasto del mes y, si el asesor agregó tareas,
 * ve las próximas.
 */
export async function ClientHome({ viewer }: { viewer: Extract<Viewer, { role: 'client' }> }) {
  const t = await getMessages();
  // El nombre va aparte para marcarlo como no traducible.
  const [greetingBefore, greetingAfter] = t.clientHome.greeting.split('{name}');
  const [latest, actionItems, documents, files, locale] = await Promise.all([
    loadLatestDelivery(viewer.clientId),
    loadActionItems(viewer.clientId),
    loadDocuments(viewer.clientId),
    loadClientFiles(viewer.clientId),
    getLocale(viewer.countryCode),
  ]);
  const delivered = Boolean(latest);
  const filesText = withAddress(t.clientFiles.home, viewer.formOfAddress);
  const askForFiles = !delivered && files?.uploadedCount === 0;
  // RLS: el cliente solo recibe las notas publicadas.
  const notesPublished = documents?.notas !== undefined;
  const nextTasks = pendingTasks(actionItems);

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <BrandMark className="size-24" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-balance wrap-anywhere">
            {greetingBefore}
            <span translate="no">{viewer.displayName}</span>
            {greetingAfter}
          </h1>
          <CoinSlot className="mx-auto" />
          <p className="text-lg text-text-muted">
            {delivered
              ? t.myPlan.ready[viewer.formOfAddress]
              : t.clientHome.preparing[viewer.formOfAddress]}
          </p>
        </div>
        {askForFiles ? (
          <section
            aria-labelledby="files-title"
            className="flex w-full flex-col gap-3 rounded-xl bg-surface p-4 text-left"
          >
            <div className="flex flex-col gap-1">
              <h2 id="files-title" className="font-semibold">
                {filesText.title}
              </h2>
              <p>{filesText.body}</p>
            </div>
            <Link
              href="/documentos"
              transitionTypes={NAV_FORWARD}
              className={`w-full ${primaryButton} ${linkButton}`}
            >
              {filesText.link}
            </Link>
          </section>
        ) : null}
        {delivered ? (
          <Link
            href="/mi-plan"
            transitionTypes={NAV_FORWARD}
            className={`w-full ${primaryButton} ${linkButton}`}
          >
            {t.myPlan.link[viewer.formOfAddress]}
          </Link>
        ) : notesPublished ? (
          <Link
            href="/mi-plan"
            transitionTypes={NAV_FORWARD}
            className={`w-full ${primaryButton} ${linkButton}`}
          >
            {t.documents.view.notesTitle[viewer.formOfAddress]}
          </Link>
        ) : null}
        <Link
          href="/control-mensual"
          transitionTypes={NAV_FORWARD}
          className={`w-full ${secondaryButton} ${linkButton}`}
        >
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
        <Link
          href="/mis-datos"
          transitionTypes={NAV_FORWARD}
          className={`inline-flex items-center ${textButton}`}
        >
          {t.myData.link}
        </Link>
        <Link
          href="/documentos"
          transitionTypes={NAV_FORWARD}
          className={`inline-flex items-center ${textButton}`}
        >
          {filesText.manage}
        </Link>
        <Link
          href="/privacidad-y-datos"
          transitionTypes={NAV_FORWARD}
          className={`inline-flex items-center ${textButton}`}
        >
          {t.clientHome.privacyLink}
        </Link>
        <SignOutButton />
        <InterfacePreferences className="justify-center" />
        <p className="text-sm text-text-muted">{t.scope.notInvestmentAdvice}</p>
      </main>
    </PageTransition>
  );
}
