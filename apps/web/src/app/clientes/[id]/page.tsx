import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { CASE_STAGES, type CaseStage, type DeliveryStage } from '@miluca/domain';
import { isOverdue, type KeyFigureId } from '@miluca/engine';
import { formatDate, formatMoney, type Language, type Messages } from '@miluca/i18n';

import { ModuleLink } from '@/components/back-link';
import { WideScreen } from '@/components/screen';
import {
  focusRing,
  gridList,
  gridListItem,
  linkButton,
  primaryButton,
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
import {
  coreSteps,
  figuresFor,
  loadActiveStages,
  progressInput,
  stageHasData,
  StageSection,
  stageSteps,
  StepList,
  type CoreStepId,
  type StageModule,
  type StageStepId,
} from '@/features/stages';
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

type Deliveries = NonNullable<Awaited<ReturnType<typeof listDeliveries>>>;

/**
 * P-A03 Ficha del cliente: los datos básicos, las tres etapas de la asesoría con sus pasos (ADR
 * 0025), la carta y la entrega, el seguimiento, las cifras de las etapas activas y la invitación.
 */
export default async function ClientPage({ params }: PageProps<'/clientes/[id]'>) {
  const t = await getMessages();
  const { id } = await params;
  await requireAdvisor(`/clientes/${id}`);
  // Independientes: todo lo de la ficha se pide a la vez.
  const [
    client,
    openInvitation,
    computed,
    deliveries,
    actionItems,
    controlEntries,
    documents,
    proposals,
    activeStages,
  ] = await Promise.all([
    getClientDetail(id),
    getOpenInvitation(id),
    loadComputedCase(id),
    listDeliveries(id),
    loadActionItems(id),
    loadControlEntries(id),
    loadDocuments(id),
    loadProposals(id),
    loadActiveStages(id),
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
            deliveries={deliveries}
            activeStages={activeStages}
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

/** La pantalla de cada paso: donde se registra el dato o, al final, la entrega de la etapa. */
function stepHref(base: string, stage: CaseStage | null, id: CoreStepId | StageStepId): string {
  switch (id) {
    case 'profile':
      return `${base}/perfil`;
    case 'incomes':
      return `${base}/ingresos`;
    case 'expenses':
      return `${base}/presupuesto`;
    case 'accounts':
      return `${base}/patrimonio`;
    case 'pockets':
      return `${base}/bolsillos`;
    case 'realityCheck':
      return `${base}/prueba-de-realidad`;
    case 'debts':
    case 'debtTerms':
      return `${base}/deudas`;
    case 'assets':
      return `${base}/patrimonio`;
    case 'insurance':
      return `${base}/seguros`;
    case 'goals':
      return `${base}/metas`;
    case 'riskProfile':
      return `${base}/inversion/perfil`;
    case 'checks':
    case 'delivered':
      return `${base}/entrega${stage ? `?etapa=${stage}` : ''}`;
  }
}

/** La última entrega que cubre la etapa: la suya o un plan completo. */
function latestFor(stage: CaseStage, deliveries: Deliveries) {
  return deliveries.find((entry) => entry.stage === stage || entry.stage === 'completo') ?? null;
}

/** Datos básicos, etapas, carta y entrega, y seguimiento, con las cifras de hoy a un lado. */
async function CaseData({
  clientId,
  computed,
  deliveries,
  activeStages,
  followUp,
  documents,
  proposals,
  children,
}: {
  clientId: string;
  computed: ComputedCase | null;
  deliveries: Deliveries | null;
  activeStages: readonly CaseStage[] | null;
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
  if (!computed || !deliveries || !activeStages) {
    return (
      <>
        <p role="alert">{t.common.loadError}</p>
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
  const { cashflow, emergencyFund, pockets } = computed.result;

  const progress = progressInput(
    computed,
    new Set<DeliveryStage>(deliveries.map((entry) => entry.stage)),
  );
  const core = coreSteps(progress).map((step) => ({
    id: step.id,
    done: step.done,
    label: t.stages.steps[step.id],
    href: stepHref(base, null, step.id),
  }));
  const coreModules: StageModule[] = [
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
      href: `${base}/monedas`,
      title: text.currencies,
      summary:
        otherCurrencies === 0
          ? text.currenciesNone.replace('{base}', client.base_currency)
          : text.currenciesSummary
              .replace('{count}', String(otherCurrencies))
              .replace('{base}', client.base_currency),
    },
    {
      href: `${base}/supuestos`,
      title: text.planSettings,
      summary: text.planSettingsSummary,
    },
  ];

  // Las pantallas de cada etapa: primero donde se registran los datos, después el análisis.
  const stageModules: Readonly<Record<CaseStage, readonly StageModule[]>> = {
    presupuesto: [
      {
        href: `${base}/presupuesto`,
        title: text.budget,
        summary: text.budgetSummary.replace('{amount}', format('monthlyExpenses')),
      },
      {
        // El saldo de hoy que se reparte en el fondo y los bolsillos (ADR 0028).
        href: `${base}/patrimonio`,
        title: text.accounts,
        summary: computed.rows.assets.some((asset) => asset.asset_type === 'liquido')
          ? text.accountsSummary.replace('{amount}', money(computed.result.liquidAssets))
          : text.accountsNone,
      },
      {
        href: `${base}/bolsillos`,
        title: text.pockets,
        summary: text.pocketsSummary.replace('{count}', String(pockets.withContribution)),
      },
      {
        href: `${base}/prueba-de-realidad`,
        title: text.realityCheck,
        summary: t.realityCheck.status[computed.result.realityCheck.status],
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
        href: `${base}/costo-de-vida`,
        title: text.costOfLiving,
        summary: text.costOfLivingSummary.replace(
          '{amount}',
          money(computed.result.costOfLiving.levels.essential.monthly),
        ),
      },
      {
        href: `${base}/fondo`,
        title: text.emergencyFund,
        summary: text.emergencyFundSummary.replace('{amount}', money(emergencyFund.currentGoal)),
      },
      {
        href: `${base}/flujo`,
        title: text.cashflow,
        summary: text.cashflowSummary
          .replace('{amount}', money(computed.result.summary.annualSurplus))
          .replace('{year}', String(cashflow.year)),
      },
      {
        href: proposalPaths(clientId).page,
        title: text.proposal,
        summary: proposalSummary(t, proposals, locale, client.country_code),
      },
    ],
    deudas: [
      {
        href: `${base}/deudas`,
        title: text.debts,
        summary:
          computed.rows.debts.length === 0
            ? text.debtsNone
            : text.debtsSummary.replace('{amount}', money(computed.result.debts.balance)),
      },
    ],
    patrimonio: [
      {
        href: `${base}/patrimonio`,
        title: text.assets,
        summary: text.assetsSummary.replace('{amount}', money(computed.result.netWorth.netWorth)),
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
        href: `${base}/inversion`,
        title: text.investment,
        summary: investmentSummary(text, computed, t.investment.levels),
      },
    ],
  };

  const documentModules: StageModule[] = [
    { href: `${base}/carta`, title: text.letter, summary: letterSummary(t, documents) },
    {
      href: `${base}/notas`,
      title: text.notes,
      summary: notesSummary(t, documents, locale, client.country_code),
    },
    {
      href: `${base}/entrega`,
      title: text.delivery,
      summary:
        deliveries.length === 0
          ? text.deliveryNone
          : (deliveries.length === 1
              ? text.deliverySummary.one
              : text.deliverySummary.other
            ).replace('{count}', String(deliveries.length)),
    },
  ];

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
  const followUpModules: StageModule[] = [
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

  const coreNext = core.find((step) => !step.done) ?? null;
  // Con deuda cara, la inversión espera: lo dice el protocolo y lo exige el control de calidad.
  const expensiveDebtNote = computed.result.expensiveDebt.exists
    ? t.stages.expensiveDebtFirst
    : null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section
          aria-labelledby="core-title"
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="core-title" className="font-semibold">
              {t.stages.coreTitle}
            </h2>
            <p className="text-sm text-text-muted">{t.stages.coreIntro}</p>
          </div>
          <StepList
            steps={core}
            doneLabel={t.stages.stepDone}
            pendingLabel={t.stages.stepPending}
          />
          {coreNext ? (
            <Link href={coreNext.href} className={`${primaryButton} ${linkButton} md:self-start`}>
              {coreNext.label}
            </Link>
          ) : null}
          <ModuleGrid modules={coreModules} />
        </section>

        {CASE_STAGES.map((stage, index) => {
          const latest = latestFor(stage, deliveries);
          return (
            <StageSection
              key={stage}
              clientId={clientId}
              stage={stage}
              number={index + 1}
              active={activeStages.includes(stage)}
              steps={stageSteps(stage, progress).map((step) => ({
                id: step.id,
                done: step.done,
                label: t.stages.steps[step.id],
                href: stepHref(base, stage, step.id),
              }))}
              delivered={latest ? { id: latest.id, deliveredOn: latest.deliveredOn } : null}
              hasData={stageHasData(stage, progress)}
              note={stage === 'patrimonio' ? expensiveDebtNote : null}
              modules={stageModules[stage]}
              locale={locale}
            />
          );
        })}

        <section aria-labelledby="documents-title" className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="documents-title" className="font-semibold">
              {t.stages.documentsTitle}
            </h2>
            <p className="text-sm text-text-muted">{t.stages.documentsIntro}</p>
          </div>
          <ModuleGrid modules={documentModules} />
        </section>

        <section aria-labelledby="follow-up-title" className="flex flex-col gap-2">
          <h2 id="follow-up-title" className="font-semibold">
            {text.followUpTitle}
          </h2>
          <ModuleGrid modules={followUpModules} />
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
            {figuresFor(activeStages).map((id) => (
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

function ModuleGrid({ modules }: { modules: readonly StageModule[] }) {
  return (
    <ul className={`${gridList} md:grid-cols-2`}>
      {modules.map((module) => (
        <li key={module.href} className={gridListItem}>
          <ModuleLink {...module} />
        </li>
      ))}
    </ul>
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
