import Link from 'next/link';

import { formatDate } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { focusRing } from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import {
  AdvisorAccessCard,
  listAdvisorAccess,
  listConsents,
  setAdvisorAccess,
  WithdrawConsent,
  withdrawSensitiveConsent,
} from '@/features/consent';
import { countryDateFormat } from '@/features/invitations';
import { InterfacePreferences } from '@/features/preferences';
import { withAddress } from '@/lib/address';
import { getLanguage, getMessages, pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('privacy');

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
 * P-C11 Privacidad y datos: acceso del asesor, consentimientos y borrar la cuenta (plan 15).
 * Exportar los datos llega en F7.
 */
export default async function PrivacyPage() {
  const messages = await getMessages();
  const viewer = await requireClient('/privacidad-y-datos');
  // Independientes: el acceso y los consentimientos se piden a la vez.
  const [access, consents] = await Promise.all([
    listAdvisorAccess(viewer.clientId),
    listConsents(viewer.clientId),
  ]);
  const t = withAddress(messages.privacy, viewer.formOfAddress);
  const { locale, timeZone } = countryDateFormat(viewer.countryCode, await getLanguage());

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
          <p role="alert">{messages.common.loadError}</p>
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
          <p role="alert">{messages.common.loadError}</p>
        ) : consents.length === 0 ? (
          <p className="text-text-muted">{t.consentsEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {consents.map((consent) => (
              <li key={consent.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{consent.title}</p>
                  <p className="text-sm">
                    {consent.withdrawnAt
                      ? t.withdrawn.replace(
                          '{date}',
                          formatDate(consent.withdrawnAt, locale, timeZone),
                        )
                      : consent.granted
                        ? t.granted
                        : t.declined}
                  </p>
                </div>
                <p className="text-sm text-text-muted">
                  {t.consentLine
                    .replace('{version}', consent.version)
                    .replace('{date}', formatDate(consent.recordedAt, locale, timeZone))}
                </p>
                {consent.kind === 'datos_sensibles' && consent.granted && !consent.withdrawnAt ? (
                  <WithdrawConsent
                    text={t}
                    action={withdrawSensitiveConsent.bind(null, consent.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="delete-account-title" className="flex flex-col items-start gap-2">
        <h2 id="delete-account-title" className="font-semibold">
          {t.deleteAccount.title}
        </h2>
        <p className="text-text-muted">{t.deleteAccount.summary}</p>
        <Link
          href="/privacidad-y-datos/borrar"
          className={`-ml-3 inline-flex min-h-12 items-center rounded-xl px-3 text-status-alert hover:underline ${focusRing}`}
        >
          {t.deleteAccount.link}
        </Link>
      </section>

      <div className="flex flex-col items-start gap-4 pb-8">
        <InterfacePreferences />
        <SignOutButton />
      </div>
    </Screen>
  );
}
