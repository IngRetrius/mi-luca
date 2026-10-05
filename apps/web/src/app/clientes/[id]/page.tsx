import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { isOverdue, type KeyFigureId } from '@miluca/engine';
import { formatDate, formatMoney, type Language, type Messages } from '@miluca/i18n';

import { ModuleLink } from '@/components/back-link';
import { WideScreen } from '@/components/screen';
import {
  focusRing,
  gridList,
  gridListItem,
  linkButton,
  secondaryButton,
} from '@/components/ui-classes';
import { loadActionItems, type ActionItemRow } from '@/features/action-plan';
import { ClientStatusBadge, getClientDetail } from '@/features/clients';
import { listDeliveries } from '@/features/deliveries';
import { loadDocuments, writtenCount, type ClientDocument } from '@/features/documents';
import { nextReview } from '@/features/follow-up';
import { investmentSummary } from '@/features/investment';
import {
  countryDateFormat,
  createInvitationLink,
  getOpenInvitation,
  InvitationPanel,
  revokeInvitation,
} from '@/features/invitations';
import { loadControlEntries } from '@/features/monthly-control';
import { loadProposals, proposalPaths, type Proposals } from '@/features/proposals';
import { formatKeyFigure, loadComputedCase, type ComputedCase } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { getLanguage, getLocale, getMessages, pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('client');

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
  const t = await getMessages();
  const { id } = await params;
  await requireAdvisor(`/clientes/${id}`);
  // Independientes: el perfil y su invitación abierta se piden a la vez.
  const [
    client,
    openInvitation,
    computed,
    deliveries,
    actionItems,
    controlEntries,
    documents,
    proposals,
  ] = await Promise.all([
    getClientDetail(id),
    getOpenInvitation(id),
    loadComputedCase(id),
    listDeliveries(id),
    loadActionItems(id),
    loadControlEntries(id),
    loadDocuments(id),
    loadProposals(id),
  ]);
  if (client === 'not-found') notFound();
  // Solo se invita a un perfil que nadie ha aceptado (RLS vuelve a exigirlo).
  const canInvite =
    client !== null && (client.status === 'borrador' || client.status === 'invitado');

  return (
    <WideScreen>
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
            followUp={{ actionItems, controlEntries }}
            documents={documents}
            proposals={proposals}
          >
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
                    openInvitation={describeInvitation(
                      t,
                      openInvitation,
                      client.countryCode,
                      await getLanguage(),
                    )}
                    createAction={createInvitationLink.bind(null, client.id)}
                    revokeAction={revokeInvitation.bind(null, client.id)}
                  />
                )
              ) : null}
            </section>
          </CaseData>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href={`/clientes/${id}`} className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      )}
    </WideScreen>
  );
}

/** La propuesta en curso (sus ajustes) o, si no hay, la última aplicada. */
function proposalSummary(
  t: Messages,
  proposals: Proposals | null,
  locale: string,
  countryCode: string,
): string {
  const text = t.clientProfile.caseData;
  if (!proposals) return t.common.loadError;
  const count = proposals.draft?.adjustments.length ?? 0;
  if (count > 0) {
    return (count === 1 ? text.proposalDraft.one : text.proposalDraft.other).replace(
      '{count}',
      String(count),
    );
  }
  const last = proposals.applied[0]?.applied_at;
  if (!last) return text.proposalNone;
  // El día en que se aplicó, en el país del cliente.
  return text.proposalApplied.replace(
    '{date}',
    formatDate(todayIn(countryCode, new Date(last)), locale, 'UTC'),
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
async function CaseData({
  clientId,
  computed,
  deliveredCount,
  followUp,
  documents,
  proposals,
  children,
}: {
  clientId: string;
  computed: ComputedCase | null;
  deliveredCount: number;
  followUp: {
    readonly actionItems: readonly ActionItemRow[] | null;
    readonly controlEntries: readonly { readonly year: number; readonly month: number }[] | null;
  };
  documents: Partial<Record<'carta' | 'notas', ClientDocument>> | null;
  proposals: Proposals | null;
  /** Lo que va en la columna lateral bajo las cifras (la invitación). */
  children: ReactNode;
}) {
  const t = await getMessages();
  const text = t.clientProfile.caseData;
  if (!computed) {
    return (
      <>
        <section aria-labelledby="case-title" className="flex flex-col gap-2">
          <h2 id="case-title" className="font-semibold">
            {text.title}
          </h2>
          <p role="alert">{t.common.loadError}</p>
        </section>
        {children}
      </>
    );
  }
  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
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
  const today = todayIn(client.country_code);
  const year = Number(today.slice(0, 4));
  const recordedMonths = new Set(
    (followUp.controlEntries ?? [])
      .filter((entry) => entry.year === year)
      .map((entry) => entry.month),
  ).size;
  const tasks = followUp.actionItems ?? [];
  const pendingTasks = tasks.filter((item) => item.status !== 'hecho');
  const overdueTasks = pendingTasks.filter((item) =>
    isOverdue({ dueDate: item.due_date, status: 'pendiente' }, today),
  ).length;
  const review = nextReview(tasks);
  const followUpModules = [
    {
      href: `${base}/seguimiento`,
      title: text.followUp,
      summary:
        followUp.actionItems === null
          ? t.common.loadError
          : !review?.due_date
            ? text.followUpNone
            : (review.due_date < today ? text.followUpOverdue : text.followUpNext).replace(
                '{date}',
                formatDate(review.due_date, locale, 'UTC'),
              ),
    },
    {
      href: `${base}/plan-de-accion`,
      title: text.actionPlan,
      summary:
        followUp.actionItems === null
          ? t.common.loadError
          : tasks.length === 0
            ? text.actionPlanNone
            : (overdueTasks > 0 ? text.actionPlanOverdue : text.actionPlanSummary)
                .replace('{pending}', String(pendingTasks.length))
                .replace('{total}', String(tasks.length))
                .replace('{overdue}', String(overdueTasks)),
    },
    {
      href: `${base}/control-mensual`,
      title: text.monthlyControl,
      summary:
        followUp.controlEntries === null
          ? t.common.loadError
          : (recordedMonths === 0 ? text.monthlyControlNone : text.monthlyControlSummary)
              .replace('{count}', String(recordedMonths))
              .replace('{year}', String(year)),
    },
  ];
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
      summary: investmentSummary(text, computed, t.investment.levels),
    },
    {
      href: proposalPaths(clientId).page,
      title: text.proposal,
      summary: proposalSummary(t, proposals, locale, client.country_code),
    },
    {
      href: `${base}/carta`,
      title: text.letter,
      summary: letterSummary(t, documents),
    },
    {
      href: `${base}/notas`,
      title: text.notes,
      summary: notesSummary(t, documents, locale, client.country_code),
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section aria-labelledby="case-title" className="flex flex-col gap-2">
          <h2 id="case-title" className="font-semibold">
            {text.title}
          </h2>
          <ul className={`${gridList} md:grid-cols-2`}>
            {modules.map((module) => (
              <li key={module.href} className={gridListItem}>
                <ModuleLink {...module} />
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="analysis-title" className="flex flex-col gap-2">
          <h2 id="analysis-title" className="font-semibold">
            {text.analysisTitle}
          </h2>
          <ul className={`${gridList} md:grid-cols-2`}>
            {analysis.map((module) => (
              <li key={module.href} className={gridListItem}>
                <ModuleLink {...module} />
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="follow-up-title" className="flex flex-col gap-2">
          <h2 id="follow-up-title" className="font-semibold">
            {text.followUpTitle}
          </h2>
          <ul className={`${gridList} md:grid-cols-2`}>
            {followUpModules.map((module) => (
              <li key={module.href} className={gridListItem}>
                <ModuleLink {...module} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="flex flex-col gap-6 lg:w-96 lg:shrink-0">
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
        {children}
      </div>
    </div>
  );
}

function letterSummary(
  t: Messages,
  documents: Partial<Record<'carta' | 'notas', ClientDocument>> | null,
) {
  const summary = t.documents.summary;
  if (!documents) return t.common.loadError;
  const letter = documents.carta;
  const { written, total } = writtenCount('carta', letter?.content ?? {});
  return written === 0
    ? summary.letterNone
    : summary.letterSome.replace('{count}', String(written)).replace('{total}', String(total));
}

function notesSummary(
  t: Messages,
  documents: Partial<Record<'carta' | 'notas', ClientDocument>> | null,
  locale: string,
  countryCode: string,
) {
  const summary = t.documents.summary;
  if (!documents) return t.common.loadError;
  const notes = documents.notas;
  if (!notes) return summary.notesNone;
  if (notes.status === 'publicado' && notes.publishedAt) {
    const day = todayIn(countryCode, new Date(notes.publishedAt));
    return summary.notesPublished.replace('{date}', formatDate(day, locale, 'UTC'));
  }
  return summary.notesDraft;
}

function describeInvitation(
  t: Messages,
  invitation: { readonly email: string | null; readonly expiresAt: string } | null,
  countryCode: string,
  language: Language,
): { expiresAt: string; description: string; email: string | null } | null {
  if (!invitation) return null;
  const { locale, timeZone } = countryDateFormat(countryCode, language);
  const date = formatDate(invitation.expiresAt, locale, timeZone);
  const description = invitation.email
    ? t.clientProfile.invite.open.replace('{email}', invitation.email).replace('{date}', date)
    : t.clientProfile.invite.openNoEmail.replace('{date}', date);
  return { expiresAt: invitation.expiresAt, description, email: invitation.email };
}
