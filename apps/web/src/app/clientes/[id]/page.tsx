import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { KEY_FIGURES, type KeyFigureId } from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { ClientStatusBadge, getClientDetail } from '@/features/clients';
import {
  countryDateFormat,
  createInvitationLink,
  getOpenInvitation,
  InvitationPanel,
  revokeInvitation,
} from '@/features/invitations';
import { loadComputedCase, type ComputedCase } from '@/features/summary';
import { requireAdvisor } from '@/server/viewer';

const t = messages.es;

export const metadata: Metadata = { title: 'Cliente | MiLuca' };

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

/** P-A03 Ficha del cliente (esqueleto): datos del perfil e invitación. */
export default async function ClientPage({ params }: PageProps<'/clientes/[id]'>) {
  const { id } = await params;
  await requireAdvisor(`/clientes/${id}`);
  // Independientes: el perfil y su invitación abierta se piden a la vez.
  const [client, openInvitation, computed] = await Promise.all([
    getClientDetail(id),
    getOpenInvitation(id),
    loadComputedCase(id),
  ]);
  if (client === 'not-found') notFound();
  // Solo se invita a un perfil que nadie ha aceptado (RLS vuelve a exigirlo).
  const canInvite =
    client !== null && (client.status === 'borrador' || client.status === 'invitado');

  return (
    <Screen>
      <Link
        href="/clientes"
        className={`-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-xl px-2 text-link hover:underline ${focusRing}`}
      >
        {backIcon}
        {t.clientProfile.backToClients}
      </Link>
      {client ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 translate="no" className="text-2xl font-semibold text-balance wrap-anywhere">
              {client.displayName}
            </h1>
            <p className="text-text-muted">
              {t.clientProfile.summary
                .replace('{country}', client.countryName)
                .replace('{currency}', client.baseCurrency)
                .replace('{address}', t.newClient[client.formOfAddress].toLowerCase())}
            </p>
            <ClientStatusBadge status={client.status} label={t.clients.status[client.status]} />
          </div>
          <CaseData clientId={client.id} computed={computed} />
          <section
            aria-labelledby="invitation-title"
            className="flex flex-col gap-2 rounded-xl bg-surface p-4"
          >
            <h2 id="invitation-title" className="font-semibold">
              {t.clientProfile.invitationTitle}
            </h2>
            <p className="text-text-muted">{t.clientProfile.invitation[client.status]}</p>
            {canInvite ? (
              openInvitation === undefined ? (
                <p role="alert">{t.common.loadError}</p>
              ) : (
                <InvitationPanel
                  text={t.clientProfile.invite}
                  openInvitation={describeInvitation(openInvitation, client.countryCode)}
                  createAction={createInvitationLink.bind(null, client.id)}
                  revokeAction={revokeInvitation.bind(null, client.id)}
                />
              )
            ) : null}
          </section>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href={`/clientes/${id}`} className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      )}
    </Screen>
  );
}

// Cifras de la ficha: las del Resumen que ya existen en F2.
const PROFILE_FIGURES: readonly KeyFigureId[] = [
  'annualIncome',
  'annualExpenses',
  'programmedSavings',
  'annualSurplus',
  'savingsRate',
];

const chevron = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Datos del caso y cifras del plan calculadas por el motor con lo registrado hoy. */
function CaseData({ clientId, computed }: { clientId: string; computed: ComputedCase | null }) {
  const text = t.clientProfile.caseData;
  if (!computed) {
    return (
      <section aria-labelledby="case-title" className="flex flex-col gap-2">
        <h2 id="case-title" className="font-semibold">
          {text.title}
        </h2>
        <p role="alert">{t.common.loadError}</p>
      </section>
    );
  }
  const { client } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const format = (id: KeyFigureId) => {
    const value = computed.figures[id];
    if (value === null) return '—';
    return KEY_FIGURES[id] === 'ratio'
      ? formatPercent(value, locale)
      : formatMoney(value, client.base_currency, locale);
  };
  return (
    <>
      <section aria-labelledby="case-title" className="flex flex-col gap-2">
        <h2 id="case-title" className="font-semibold">
          {text.title}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          <li>
            <Link
              href={`/clientes/${clientId}/presupuesto`}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
            >
              <span className="flex flex-col">
                <span className="font-medium">{text.budget}</span>
                <span className="text-sm text-text-muted">
                  {text.budgetSummary.replace('{amount}', format('monthlyExpenses'))}
                </span>
              </span>
              {chevron}
            </Link>
          </li>
        </ul>
      </section>
      <section
        aria-labelledby="figures-title"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="figures-title" className="font-semibold">
          {text.figuresTitle}
        </h2>
        <dl className="flex flex-col gap-1">
          {PROFILE_FIGURES.map((id) => (
            <div key={id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt>{t.keyFigures[id]}</dt>
              <dd className="font-medium tabular-nums">{format(id)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-text-muted">{text.figuresNote}</p>
      </section>
    </>
  );
}

function describeInvitation(
  invitation: { readonly email: string | null; readonly expiresAt: string } | null,
  countryCode: string,
): { expiresAt: string; description: string; email: string | null } | null {
  if (!invitation) return null;
  const { locale, timeZone } = countryDateFormat(countryCode);
  const date = formatDate(invitation.expiresAt, locale, timeZone);
  const description = invitation.email
    ? t.clientProfile.invite.open.replace('{email}', invitation.email).replace('{date}', date)
    : t.clientProfile.invite.openNoEmail.replace('{date}', date);
  return { expiresAt: invitation.expiresAt, description, email: invitation.email };
}
