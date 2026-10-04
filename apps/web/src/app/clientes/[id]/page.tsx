import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { KeyFigureId } from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, formatMoney, messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { ModuleLink } from '@/components/back-link';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { ClientStatusBadge, getClientDetail } from '@/features/clients';
import { listDeliveries } from '@/features/deliveries';
import { investmentSummary } from '@/features/investment';
import {
  countryDateFormat,
  createInvitationLink,
  getOpenInvitation,
  InvitationPanel,
  revokeInvitation,
} from '@/features/invitations';
import { formatKeyFigure, loadComputedCase, type ComputedCase } from '@/features/summary';
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
  const [client, openInvitation, computed, deliveries] = await Promise.all([
    getClientDetail(id),
    getOpenInvitation(id),
    loadComputedCase(id),
    listDeliveries(id),
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
          <CaseData
            clientId={client.id}
            computed={computed}
            deliveredCount={deliveries?.length ?? 0}
          />
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

// Cifras de la ficha: las del Resumen que ya calcula el motor.
const PROFILE_FIGURES: readonly KeyFigureId[] = [
  'annualIncome',
  'annualExpenses',
  'programmedSavings',
  'annualSurplus',
  'savingsRate',
  'debtLoad',
  'totalDebt',
  'expensiveDebtMonths',
  'emergencyGoal',
  'emergencyProgress',
  'noIncomeShortfall',
  'annualInvestment',
  'growthShare',
  'netWorth',
];

/** Datos del caso y cifras del plan calculadas por el motor con lo registrado hoy. */
function CaseData({
  clientId,
  computed,
  deliveredCount,
}: {
  clientId: string;
  computed: ComputedCase | null;
  deliveredCount: number;
}) {
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
  const format = (id: KeyFigureId) =>
    formatKeyFigure(id, computed.figures[id], {
      locale,
      currency: client.base_currency,
      months: t.keyFigureMonths,
    });
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const types: Readonly<Record<string, string>> = t.profile.types;
  const cutoff = computed.rows.settings?.cutoff_date
    ? formatDate(computed.rows.settings.cutoff_date, locale, 'UTC')
    : text.today;
  const otherCurrencies = computed.rows.fxRates.length;
  const base = `/clientes/${clientId}`;
  const modules = [
    {
      href: `${base}/perfil`,
      title: text.profile,
      summary: text.profileSummary
        .replace('{type}', types[client.client_type ?? 'none'] ?? types.none ?? '')
        .replace('{cutoff}', cutoff),
    },
    {
      href: `${base}/ingresos`,
      title: text.incomes,
      summary: text.incomesSummary.replace('{amount}', money(computed.result.incomes.annual)),
    },
    {
      href: `${base}/presupuesto`,
      title: text.budget,
      summary: text.budgetSummary.replace('{amount}', format('monthlyExpenses')),
    },
    {
      href: `${base}/costo-de-vida`,
      title: text.costOfLiving,
      summary: text.costOfLivingSummary.replace(
        '{amount}',
        money(computed.result.costOfLiving.levels.essential.monthly),
      ),
    },
    {
      href: `${base}/supuestos`,
      title: text.planSettings,
      summary: text.planSettingsSummary,
    },
    {
      href: `${base}/patrimonio`,
      title: text.assets,
      summary: text.assetsSummary.replace('{amount}', money(computed.result.netWorth.netWorth)),
    },
    {
      href: `${base}/metas`,
      title: text.goals,
      summary:
        computed.rows.goals.length === 0
          ? text.goalsNone
          : (computed.rows.goals.length === 1 ? text.goalsSummary.one : text.goalsSummary.other)
              .replace('{count}', String(computed.rows.goals.length))
              .replace('{amount}', money(computed.result.goals.monthlyTotal)),
    },
    {
      href: `${base}/seguros`,
      title: text.insurance,
      summary: text.insuranceSummary.replace(
        '{amount}',
        money(computed.result.insurance.newPremiumsAnnual),
      ),
    },
    {
      href: `${base}/deudas`,
      title: text.debts,
      summary:
        computed.rows.debts.length === 0
          ? text.debtsNone
          : text.debtsSummary.replace('{amount}', money(computed.result.debts.balance)),
    },
    {
      href: `${base}/cobros`,
      title: text.receivables,
      summary:
        computed.rows.receivables.length === 0
          ? text.receivablesNone
          : text.receivablesSummary.replace(
              '{amount}',
              money(computed.result.receivables.totalPending),
            ),
    },
    {
      href: `${base}/prueba-de-realidad`,
      title: text.realityCheck,
      summary: t.realityCheck.status[computed.result.realityCheck.status],
    },
    {
      href: `${base}/monedas`,
      title: text.currencies,
      summary:
        otherCurrencies === 0
          ? text.currenciesNone.replace('{base}', client.base_currency)
          : text.currenciesSummary
              .replace('{count}', String(otherCurrencies))
              .replace('{base}', client.base_currency),
    },
  ];
  const { cashflow, emergencyFund, pockets } = computed.result;
  const analysis = [
    {
      href: `${base}/flujo`,
      title: text.cashflow,
      summary: text.cashflowSummary
        .replace('{amount}', money(computed.result.summary.annualSurplus))
        .replace('{year}', String(cashflow.year)),
    },
    {
      href: `${base}/fondo`,
      title: text.emergencyFund,
      summary: text.emergencyFundSummary.replace('{amount}', money(emergencyFund.currentGoal)),
    },
    {
      href: `${base}/bolsillos`,
      title: text.pockets,
      summary: text.pocketsSummary.replace('{count}', String(pockets.withContribution)),
    },
    {
      href: `${base}/inversion`,
      title: text.investment,
      summary: investmentSummary(text, computed),
    },
    {
      href: `${base}/entrega`,
      title: text.delivery,
      summary:
        deliveredCount === 0
          ? text.deliveryNone
          : text.deliverySummary.replace('{count}', String(deliveredCount)),
    },
  ];
  return (
    <>
      <section aria-labelledby="case-title" className="flex flex-col gap-2">
        <h2 id="case-title" className="font-semibold">
          {text.title}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {modules.map((module) => (
            <li key={module.href}>
              <ModuleLink {...module} />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="analysis-title" className="flex flex-col gap-2">
        <h2 id="analysis-title" className="font-semibold">
          {text.analysisTitle}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {analysis.map((module) => (
            <li key={module.href}>
              <ModuleLink {...module} />
            </li>
          ))}
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
