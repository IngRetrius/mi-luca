import type { Metadata } from 'next';
import Link from 'next/link';

import { formatDate, messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { focusRing } from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import {
  AdvisorAccessCard,
  listAdvisorAccess,
  listConsents,
  setAdvisorAccess,
} from '@/features/consent';
import { countryDateFormat } from '@/features/invitations';
import { withAddress } from '@/lib/address';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Privacidad y datos | MiLuca' };

const backIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * P-C11 Privacidad y datos (primera parte): acceso del asesor y consentimientos. Exportar y pedir
 * el borrado llegan en F7.
 */
export default async function PrivacyPage() {
  const viewer = await requireClient('/privacidad-y-datos');
  // Independientes: el acceso y los consentimientos se piden a la vez.
  const [access, consents] = await Promise.all([
    listAdvisorAccess(viewer.clientId),
    listConsents(viewer.clientId),
  ]);
  const t = withAddress(messages.es.privacy, viewer.formOfAddress);
  const { locale, timeZone } = countryDateFormat(viewer.countryCode);

  return (
    <Screen>
      <Link
        href="/"
        className={`-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-xl px-2 text-link hover:underline ${focusRing}`}
      >
        {backIcon}
        {t.back}
      </Link>
      <h1 className="text-2xl font-semibold text-balance">{t.title}</h1>

      <section
        aria-labelledby="advisor-title"
        className="flex flex-col gap-4 rounded-xl bg-surface p-4"
      >
        <h2 id="advisor-title" className="font-semibold">
          {t.advisorTitle}
        </h2>
        {access === null ? (
          <p role="alert">{messages.es.common.loadError}</p>
        ) : access.length === 0 ? (
          <p className="text-text-muted">{t.noAdvisor}</p>
        ) : (
          access.map((row) => (
            <AdvisorAccessCard
              key={row.advisorId}
              advisorName={row.advisorName}
              status={row.status}
              text={t}
              action={setAdvisorAccess.bind(null, row.advisorId)}
            />
          ))
        )}
      </section>

      <section aria-labelledby="consents-title" className="flex flex-col gap-3">
        <h2 id="consents-title" className="font-semibold">
          {t.consentsTitle}
        </h2>
        {consents === null ? (
          <p role="alert">{messages.es.common.loadError}</p>
        ) : consents.length === 0 ? (
          <p className="text-text-muted">{t.consentsEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {consents.map((consent) => (
              <li key={consent.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{consent.title}</p>
                  <p className="text-sm">{consent.granted ? t.granted : t.declined}</p>
                </div>
                <p className="text-sm text-text-muted">
                  {t.consentLine
                    .replace('{version}', consent.version)
                    .replace('{date}', formatDate(consent.recordedAt, locale, timeZone))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pb-8">
        <SignOutButton />
      </div>
    </Screen>
  );
}
