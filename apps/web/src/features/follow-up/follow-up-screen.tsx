import Link from 'next/link';
import { notFound } from 'next/navigation';

import { isOverdue, type KeyFigures } from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, formatMoney, messages } from '@miluca/i18n';

import { BackLink, LoadError, ModuleLink } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { linkButton, textButton } from '@/components/ui-classes';
import { actionPlanPaths, loadActionItems, type ActionItemRow } from '@/features/action-plan';
import { getClientDetail } from '@/features/clients';
import { loadLatestDelivery, PlanComparison, type Delivery } from '@/features/deliveries';
import {
  deviationText,
  loadControlEntries,
  monthlyControlPaths,
  yearControl,
  type MonthlyControlEntryRow,
} from '@/features/monthly-control';
import { loadComputedCase, type ComputedCase } from '@/features/summary';
import { todayIn } from '@/lib/dates';

import { continuitySheet } from './continuity';
import { continuityInput } from './continuity-input';
import { ContinuitySection } from './continuity-section';
import { followUpPaths } from './paths';
import { loadContinuityNotes, loadMinimumWage } from './queries';
import { nextReview, reviews } from './reviews';
import { ReviewsSection } from './reviews-section';

const t = messages.es;
const text = t.followUp;

/** "Frente al plan entregado": las cifras del último plan que cambiaron con los datos de hoy. */
function PlanSection({
  clientId,
  latest,
  today,
  locale,
  countryCode,
}: {
  clientId: string;
  latest: Delivery | null;
  today: KeyFigures;
  locale: string;
  countryCode: string;
}) {
  return (
    <section
      aria-labelledby="plan-title"
      className="flex flex-col gap-2 rounded-xl border border-border p-4"
    >
      <h2 id="plan-title" className="font-semibold">
        {text.plan.title}
      </h2>
      {latest ? (
        <>
          <p className="text-sm text-text-muted">
            {text.plan.delivered
              .replace('{label}', latest.label)
              .replace(
                '{date}',
                formatDate(todayIn(countryCode, new Date(latest.deliveredAt)), locale, 'UTC'),
              )}{' '}
            {t.plan.currencyNote.replace('{currency}', latest.baseCurrency)}
          </p>
          <PlanComparison
            delivered={latest.keyFigures}
            today={today}
            locale={locale}
            currency={latest.baseCurrency}
          />
          <Link
            href={`/clientes/${clientId}/planes/${latest.id}`}
            className={`self-start ${textButton} ${linkButton}`}
          >
            {text.plan.view}
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm">{text.plan.none}</p>
          <Link
            href={`/clientes/${clientId}/entrega`}
            className={`self-start ${textButton} ${linkButton}`}
          >
            {text.plan.deliver}
          </Link>
        </>
      )}
    </section>
  );
}

/** "Cómo va": gasto real del año frente al presupuesto y avance del plan de acción. */
function ProgressSection({
  clientId,
  computed,
  entries,
  tasks,
  today,
  locale,
}: {
  clientId: string;
  computed: ComputedCase;
  entries: readonly MonthlyControlEntryRow[];
  tasks: readonly ActionItemRow[];
  today: string;
  locale: string;
}) {
  const caseText = t.clientProfile.caseData;
  const year = Number(today.slice(0, 4));
  const control = yearControl(
    computed,
    entries.filter((entry) => entry.year === year),
  );
  const { total } = control;
  const months = total.months.filter((value) => value !== null).length;
  const money = (amount: number) => formatMoney(amount, computed.rows.client.base_currency, locale);
  const status = deviationText(total.averageReal, total.monthlyBudget, locale);
  const spending =
    months === 0
      ? t.monthlyControl.yearNone.replace('{year}', String(year))
      : [
          t.monthlyControl.yearRow
            .replace('{real}', money(total.averageReal ?? 0))
            .replace('{budget}', money(total.monthlyBudget))
            .replace(
              '{months}',
              (months === 1
                ? t.monthlyControl.monthsCount.one
                : t.monthlyControl.monthsCount.other
              ).replace('{count}', String(months)),
            ),
          status?.label,
        ]
          .filter(Boolean)
          .join(' · ');
  const pending = tasks.filter((task) => task.status !== 'hecho');
  const overdue = pending.filter((task) =>
    isOverdue({ dueDate: task.due_date, status: 'pendiente' }, today),
  ).length;
  const taskSummary =
    tasks.length === 0
      ? caseText.actionPlanNone
      : (overdue > 0 ? caseText.actionPlanOverdue : caseText.actionPlanSummary)
          .replace('{pending}', String(pending.length))
          .replace('{total}', String(tasks.length))
          .replace('{overdue}', String(overdue));
  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-2">
      <h2 id="progress-title" className="font-semibold">
        {text.progress.title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <li>
          <ModuleLink
            href={monthlyControlPaths('advisor', clientId).list}
            title={text.progress.spending.replace('{year}', String(year))}
            summary={spending}
          />
        </li>
        <li>
          <ModuleLink
            href={actionPlanPaths('advisor', clientId).list}
            title={text.progress.tasks}
            summary={taskSummary}
          />
        </li>
      </ul>
    </section>
  );
}

/**
 * P-A16 Seguimiento (fase 12 del protocolo): el último plan entregado frente a hoy, cómo van el
 * gasto real y las tareas, las revisiones a 30 días, 90 días y anual, y la ficha de continuidad.
 */
export async function FollowUpScreen({ clientId }: { clientId: string }) {
  const paths = followUpPaths(clientId);
  const [client, computed, latest, tasks, entries, notes] = await Promise.all([
    getClientDetail(clientId),
    loadComputedCase(clientId),
    loadLatestDelivery(clientId),
    loadActionItems(clientId),
    loadControlEntries(clientId),
    loadContinuityNotes(clientId),
  ]);
  if (client === 'not-found') notFound();
  const header = (
    <>
      <BackLink href={paths.back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!client || !computed || latest === undefined || !tasks || !entries || !notes) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.page}
        />
      </Screen>
    );
  }

  const country = computed.rows.client.country_code;
  const locale = COUNTRY_LOCALES[country]?.locale ?? 'es';
  const today = todayIn(country);
  // Salario mínimo vigente en la fecha de corte: necesita el país, por eso va después.
  const minimumWage = await loadMinimumWage(country, computed.input.cutoffDate);
  const sheet = continuitySheet(
    continuityInput({
      computed,
      client,
      notes,
      tasks,
      lastDelivery: latest,
      nextReview: nextReview(tasks)?.due_date ?? null,
      minimumWage,
      today,
      locale,
    }),
    text.sheet,
    { owners: t.actionPlan.owners, clientTypes: t.profile.types },
  );

  return (
    <Screen>
      {header}
      <PlanSection
        clientId={clientId}
        latest={latest}
        today={computed.figures}
        locale={locale}
        countryCode={country}
      />
      <ProgressSection
        clientId={clientId}
        computed={computed}
        entries={entries}
        tasks={tasks}
        today={today}
        locale={locale}
      />
      <ReviewsSection
        clientId={clientId}
        list={reviews(tasks, today)}
        locale={locale}
        countryCode={country}
      />
      <ContinuitySection sheet={sheet} notesHref={paths.notes} />
    </Screen>
  );
}
