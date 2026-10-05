import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { KeyFigureId, KeyFigures } from '@miluca/engine';
import { categoryLabel, formatDate, formatMoney, type Messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { DeleteDisclosure } from '@/components/form-actions';
import { RowSubmitButton } from '@/components/row-submit-button';
import { Screen, ScreenActions, WideScreen } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { linkButton, primaryButton, textButton } from '@/components/ui-classes';
import { formatKeyFigure, loadComputedCase, type ComputedCase } from '@/features/summary';
import { amountToText } from '@/lib/amount';
import { todayIn } from '@/lib/dates';
import { getLanguage, getLocale, getMessages } from '@/server/i18n';

import {
  deleteAdjustment,
  discardProposal,
  saveAdjustment,
  setAdjustmentDecision,
  startFromBasicLevel,
  applyProposal,
} from './actions';
import { AdjustmentForm, type AdjustmentItemGroup } from './adjustment-form';
import { ApplyForm } from './apply-form';
import { DecisionButtons } from './decision-buttons';
import { proposalPaths } from './paths';
import { loadProposals, type AdjustmentRow, type ProposalWithAdjustments } from './queries';
import {
  acceptedAdjustments,
  adjustmentState,
  compareProposal,
  computeProposal,
  monthlyChange,
  toScenario,
} from './scenario';
import { addDays, TASK_DUE_DAYS } from './tasks';

type BudgetItem = ComputedCase['rows']['budgetItems'][number];

// Por debajo de esto, un ajuste no cambia el gasto (ruido de redondeo).
const NO_EFFECT = 0.005;

/** Las cifras que compara la propuesta: gasto, sobrante, ahorro, deuda cara (si hay) e inversión. */
function comparedFigures(
  mode: ComputedCase['mode'],
  before: KeyFigures,
  after: KeyFigures,
): KeyFigureId[] {
  return [
    'monthlyExpenses',
    'annualSurplus',
    mode === 'native' ? 'ownSavingsRate' : 'savingsRate',
    ...(before.expensiveDebtMonths !== null || after.expensiveDebtMonths !== null
      ? (['expensiveDebtMonths'] as const)
      : []),
    'annualInvestment',
  ];
}

/** Los textos y formatos de un caso que comparten las pantallas de la propuesta. */
async function caseFormat(t: Messages, computed: ComputedCase) {
  const { client } = computed.rows;
  const [locale, language] = await Promise.all([getLocale(client.country_code), getLanguage()]);
  const money = (amount: number | null, currency: string) =>
    amount === null ? '—' : formatMoney(amount, currency, locale);
  const frequency = (value: string | null) =>
    value === null
      ? t.budget.noFrequency
      : (t.budget.frequencies[value as keyof typeof t.budget.frequencies] ?? value);
  const figure = (id: KeyFigureId, figures: KeyFigures) =>
    formatKeyFigure(id, figures[id], {
      locale,
      currency: client.base_currency,
      months: t.keyFigureMonths,
    });
  const date = (value: string) => formatDate(value, locale, 'UTC');
  return { locale, language, money, frequency, figure, date, today: todayIn(client.country_code) };
}

/** Hoy frente a la propuesta, en una tabla de tres columnas que cabe en 320 px. */
function Comparison({
  t,
  ids,
  before,
  after,
  figure,
}: {
  t: Messages;
  ids: readonly KeyFigureId[];
  before: KeyFigures;
  after: KeyFigures;
  figure: (id: KeyFigureId, figures: KeyFigures) => string;
}) {
  const text = t.proposal;
  return (
    <section
      aria-labelledby="comparison-title"
      className="flex flex-col gap-3 rounded-xl bg-surface p-4"
    >
      <h2 id="comparison-title" className="font-semibold">
        {text.comparisonTitle}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {text.figure}
            </th>
            <th scope="col" className="pb-1 pl-2 text-right font-medium">
              {text.today}
            </th>
            <th scope="col" className="pb-1 pl-2 text-right font-medium">
              {text.withProposal}
            </th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const today = figure(id, before);
            const proposed = figure(id, after);
            return (
              <tr key={id} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-normal">
                  {t.keyFigures[id]}
                </th>
                <td className="py-2 pl-2 text-right tabular-nums">{today}</td>
                <td
                  className={`py-2 pl-2 text-right tabular-nums ${proposed === today ? '' : 'font-semibold'}`}
                >
                  {proposed}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-sm text-text-muted">{text.illustrative}</p>
    </section>
  );
}

/** "200.000 $ → 150.000 $" o "200.000 $ → Se quita", con el gasto de hoy si existe. */
function changeText(
  text: Messages['proposal'],
  row: AdjustmentRow,
  item: BudgetItem | undefined,
  money: (amount: number | null, currency: string) => string,
): string {
  const from = item ? money(item.amount, item.currency) : money(row.from_amount, row.currency);
  const to = row.kind === 'quitar' ? text.removal : money(row.amount, row.currency);
  return text.change.replace('{from}', from).replace('{to}', to);
}

/** P-A25 Propuesta del asesor: comparación, ajustes con la decisión del cliente y lo aplicado. */
export async function ProposalScreen({
  clientId,
  searchParams,
}: {
  clientId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getMessages();
  const text = t.proposal;
  const paths = proposalPaths(clientId);
  const [computed, proposals] = await Promise.all([
    loadComputedCase(clientId),
    loadProposals(clientId),
  ]);
  const header = (
    <>
      <BackLink href={paths.back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!computed || !proposals) {
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

  const format = await caseFormat(t, computed);
  const items = computed.rows.budgetItems;
  const rows = proposals.draft?.adjustments ?? [];
  const scenario = rows.map(toScenario);
  const comparison = compareProposal(computed.rows, computed.figures, scenario, format.today);
  const accepted = acceptedAdjustments(scenario, items).length;
  const adjusted = new Set(rows.map((row) => row.budget_item_id));
  const basicCandidates = items.filter(
    (item) =>
      item.scope === 'presupuesto' &&
      item.basic_amount !== null &&
      item.basic_amount !== item.amount &&
      !adjusted.has(item.id),
  ).length;
  // Lo que cambia el propio gasto al mes; si es ahorro programado, se dice como ahorro.
  const effectText = (change: number | null, item: BudgetItem | undefined) => {
    if (change === null) return null;
    if (Math.abs(change) < NO_EFFECT) return text.effectNone;
    const amount = format.money(Math.abs(change), computed.rows.client.base_currency);
    const saving = item?.expense_type === 'ahorro';
    const template =
      change < 0
        ? saving
          ? text.saveLess
          : text.spendLess
        : saving
          ? text.saveMore
          : text.spendMore;
    return template.replace('{amount}', amount);
  };

  return (
    <WideScreen>
      {header}
      {searchParams.aplicada ? (
        <p role="status" className="rounded-xl border border-status-ok p-4">
          {text.appliedNotice}
        </p>
      ) : null}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:order-last lg:w-96 lg:shrink-0">
          <Comparison
            t={t}
            ids={comparedFigures(computed.mode, comparison.before, comparison.after)}
            before={comparison.before}
            after={comparison.after}
            figure={format.figure}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="adjustments-title" className="flex flex-col gap-2">
            <h2 id="adjustments-title" className="font-semibold">
              {text.adjustmentsTitle}
            </h2>
            {rows.length === 0 ? (
              <p className="text-text-muted">{text.empty}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {rows.map((row, index) => {
                  const item = items.find((candidate) => candidate.id === row.budget_item_id);
                  const state = adjustmentState(scenario[index]!, items);
                  const effect = effectText(
                    monthlyChange(
                      scenario[index]!,
                      item ? computed.budgetRowById.get(item.id) : undefined,
                      computed.input.fx,
                    ),
                    item,
                  );
                  const describedBy = `adjustment-${row.id}`;
                  return (
                    <li key={row.id} className="flex flex-col gap-3 p-4">
                      <div id={describedBy} className="flex flex-col gap-1">
                        <span className="font-medium wrap-anywhere">
                          {item?.concept ?? row.concept}
                        </span>
                        <span className="text-sm text-text-muted">
                          {item ? `${categoryLabel(item.category, format.language)} · ` : ''}
                          {format.frequency(item?.frequency ?? row.frequency)}
                        </span>
                        <span className="tabular-nums">
                          {changeText(text, row, item, format.money)}
                        </span>
                        {state === 'ok' ? (
                          effect ? (
                            <span className="text-sm">{effect}</span>
                          ) : null
                        ) : (
                          <StatusLabel status="warning" label={text[state]} />
                        )}
                        {row.reason ? (
                          <span className="text-sm wrap-anywhere">“{row.reason}”</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={setAdjustmentDecision.bind(null, clientId, row.id)}>
                          <DecisionButtons
                            current={scenario[index]!.decision}
                            labels={text.decisions}
                            label={text.decisionLabel}
                            describedBy={describedBy}
                          />
                        </form>
                        <Link
                          href={paths.adjustment(row.id)}
                          aria-describedby={describedBy}
                          className={`${textButton} ${linkButton}`}
                        >
                          {text.edit}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {basicCandidates > 0 ? (
              <form
                action={startFromBasicLevel.bind(null, clientId)}
                className="flex flex-col items-start gap-2 pt-2"
              >
                <p id="from-basic-hint" className="text-sm text-text-muted">
                  {text.fromBasicHint}
                </p>
                <RowSubmitButton
                  label={text.fromBasic}
                  pendingLabel={text.fromBasicWorking}
                  describedBy="from-basic-hint"
                />
              </form>
            ) : null}
            {proposals.draft ? (
              <form className="pt-2">
                <DeleteDisclosure
                  toggle={text.discardToggle}
                  hint={text.discardHint}
                  confirm={text.discardConfirm}
                  action={discardProposal.bind(null, clientId)}
                />
              </form>
            ) : null}
          </section>
          <AppliedProposals
            t={t}
            proposals={proposals.applied}
            format={format}
            countryCode={computed.rows.client.country_code}
            baseCurrency={computed.rows.client.base_currency}
          />
        </div>
      </div>
      <ScreenActions>
        {accepted > 0 ? (
          <>
            <Link href={paths.apply} className={`w-full ${primaryButton} ${linkButton}`}>
              {text.applyButton.replace('{count}', String(accepted))}
            </Link>
            <Link href={paths.add} className={`w-full ${textButton} ${linkButton}`}>
              {text.add}
            </Link>
          </>
        ) : (
          <>
            {rows.length > 0 ? <p className="text-sm text-text-muted">{text.applyNone}</p> : null}
            <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
              {text.add}
            </Link>
          </>
        )}
      </ScreenActions>
    </WideScreen>
  );
}

/** Las propuestas aplicadas: fecha, lo que se aplicó y el sobrante antes y después. */
function AppliedProposals({
  t,
  proposals,
  format,
  countryCode,
  baseCurrency,
}: {
  t: Messages;
  proposals: readonly ProposalWithAdjustments[];
  format: Awaited<ReturnType<typeof caseFormat>>;
  countryCode: string;
  baseCurrency: string;
}) {
  const text = t.proposal;
  if (proposals.length === 0) return null;
  return (
    <section aria-labelledby="applied-title" className="flex flex-col gap-2">
      <h2 id="applied-title" className="font-semibold">
        {text.appliedTitle}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {proposals.map((proposal) => {
          const applied = proposal.adjustments.filter((row) => row.applied);
          // El día en que se aplicó, en el país del cliente.
          const day = proposal.applied_at
            ? format.date(todayIn(countryCode, new Date(proposal.applied_at)))
            : '';
          const surplus = (figures: unknown) => {
            const value = (figures as Partial<KeyFigures> | null)?.annualSurplus;
            return typeof value === 'number' ? format.money(value, baseCurrency) : '—';
          };
          return (
            <li key={proposal.id} className="flex flex-col gap-1 p-4">
              <span className="font-medium">
                {(applied.length === 1 ? text.appliedItem.one : text.appliedItem.other)
                  .replace('{date}', day)
                  .replace('{count}', String(applied.length))}
              </span>
              <span className="text-sm tabular-nums">
                {text.appliedSurplus
                  .replace('{before}', surplus(proposal.before_figures))
                  .replace('{after}', surplus(proposal.after_figures))}
              </span>
              <ul className="flex flex-col gap-1 text-sm text-text-muted">
                {applied.map((row) => (
                  <li key={row.id} className="wrap-anywhere">
                    {row.concept}: {changeText(text, row, undefined, format.money)}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Crear (`adjustmentId` null) o editar un ajuste de la propuesta en borrador. */
export async function AdjustmentFormScreen({
  clientId,
  adjustmentId,
}: {
  clientId: string;
  adjustmentId: string | null;
}) {
  const t = await getMessages();
  const text = t.proposal;
  const paths = proposalPaths(clientId);
  const title = adjustmentId ? text.form.editTitle : text.form.newTitle;
  const [computed, proposals] = await Promise.all([
    loadComputedCase(clientId),
    loadProposals(clientId),
  ]);
  if (!computed || !proposals) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={adjustmentId ? paths.adjustment(adjustmentId) : paths.add}
        />
      </Screen>
    );
  }
  const row = adjustmentId
    ? proposals.draft?.adjustments.find((candidate) => candidate.id === adjustmentId)
    : null;
  if (adjustmentId && !row) notFound();

  const format = await caseFormat(t, computed);
  const current = (item: BudgetItem) =>
    text.form.current
      .replace('{amount}', format.money(item.amount, item.currency))
      .replace('{frequency}', format.frequency(item.frequency));
  // Al crear, los gastos del presupuesto que suman y aún no tienen ajuste, por categoría.
  const adjusted = new Set(
    proposals.draft?.adjustments.map((candidate) => candidate.budget_item_id),
  );
  const groups: AdjustmentItemGroup[] = [];
  for (const item of computed.rows.budgetItems) {
    if (item.scope !== 'presupuesto' || adjusted.has(item.id)) continue;
    const category = categoryLabel(item.category, format.language);
    let group = groups.find((candidate) => candidate.category === category);
    if (!group) {
      group = { category, items: [] };
      groups.push(group);
    }
    (group.items as AdjustmentItemGroup['items'][number][]).push({
      id: item.id,
      label: text.form.itemOption
        .replace('{concept}', item.concept)
        .replace('{amount}', format.money(item.amount, item.currency))
        .replace('{frequency}', format.frequency(item.frequency)),
      current: current(item),
    });
  }
  const item = row
    ? computed.rows.budgetItems.find((candidate) => candidate.id === row.budget_item_id)
    : undefined;

  return (
    <Screen>
      <BackLink href={paths.page} label={text.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      {row && !item ? <StatusLabel status="warning" label={text.missingItem} /> : null}
      <AdjustmentForm
        text={text.form}
        groups={adjustmentId ? [] : groups}
        fixedItem={
          row
            ? { concept: item?.concept ?? row.concept, current: item ? current(item) : null }
            : null
        }
        initial={{
          item: row?.budget_item_id ?? '',
          kind: row?.kind ?? 'ajustar',
          amount: amountToText(row?.amount ?? null, format.locale),
          reason: row?.reason ?? '',
        }}
        action={saveAdjustment.bind(null, clientId, adjustmentId)}
        deleteAction={adjustmentId ? deleteAdjustment.bind(null, clientId, adjustmentId) : null}
        cancelHref={paths.page}
      />
    </Screen>
  );
}

/** Confirmar "Aplicar lo aceptado": qué cambia, qué se quita, las tareas y lo que no se aplica. */
export async function ApplyProposalScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.proposal;
  const screen = text.applyScreen;
  const paths = proposalPaths(clientId);
  const [computed, proposals] = await Promise.all([
    loadComputedCase(clientId),
    loadProposals(clientId),
  ]);
  const header = (
    <>
      <BackLink href={paths.page} label={text.title} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{screen.title}</h1>
        <p className="text-text-muted">{screen.intro}</p>
      </div>
    </>
  );
  if (!computed || !proposals) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.apply}
        />
      </Screen>
    );
  }
  const format = await caseFormat(t, computed);
  const items = computed.rows.budgetItems;
  const rows = proposals.draft?.adjustments ?? [];
  const scenario = rows.map(toScenario);
  const accepted = acceptedAdjustments(scenario, items);
  if (accepted.length === 0) {
    return (
      <Screen>
        {header}
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {screen.errors[proposals.draft ? 'nothingAccepted' : 'notFound']}
        </p>
        <ScreenActions>
          <Link href={paths.page} className={`w-full ${primaryButton} ${linkButton}`}>
            {screen.cancel}
          </Link>
        </ScreenActions>
      </Screen>
    );
  }
  const after = computeProposal(computed.rows, accepted, format.today);
  const acceptedRows = accepted.flatMap((adjustment) =>
    rows.filter((row) => row.id === adjustment.id),
  );
  const line = (row: AdjustmentRow) => {
    const item = items.find((candidate) => candidate.id === row.budget_item_id);
    return `${item?.concept ?? row.concept}: ${changeText(text, row, item, format.money)}`;
  };
  const changes = acceptedRows.filter((row) => row.kind === 'ajustar');
  const removals = acceptedRows.filter((row) => row.kind === 'quitar');
  // Lo pendiente pasa a una propuesta nueva; lo descartado queda en el registro.
  const pending = rows.filter((row) => row.decision === 'pendiente' && row.budget_item_id).length;
  const discarded = rows.filter((row) => row.decision === 'descartado').length;
  const due = format.date(addDays(format.today, TASK_DUE_DAYS));

  return (
    <Screen>
      {header}
      <Comparison
        t={t}
        ids={comparedFigures(computed.mode, computed.figures, after)}
        before={computed.figures}
        after={after}
        figure={format.figure}
      />
      {changes.length > 0 ? (
        <section aria-labelledby="changes-title" className="flex flex-col gap-2">
          <h2 id="changes-title" className="font-semibold">
            {screen.changes}
          </h2>
          <ul className="flex flex-col gap-1">
            {changes.map((row) => (
              <li key={row.id} className="tabular-nums wrap-anywhere">
                {line(row)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {removals.length > 0 ? (
        <section aria-labelledby="removals-title" className="flex flex-col gap-2">
          <h2 id="removals-title" className="font-semibold">
            {screen.removals}
          </h2>
          <ul className="flex flex-col gap-1">
            {removals.map((row) => {
              const item = items.find((candidate) => candidate.id === row.budget_item_id);
              return (
                <li key={row.id} className="wrap-anywhere">
                  {item?.concept ?? row.concept}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <p>
        {(accepted.length === 1 ? screen.tasks.one : screen.tasks.other)
          .replace('{count}', String(accepted.length))
          .replace('{date}', due)}
      </p>
      {pending > 0 ? (
        <p>
          {(pending === 1 ? screen.pending.one : screen.pending.other).replace(
            '{count}',
            String(pending),
          )}
        </p>
      ) : null}
      {discarded > 0 ? (
        <p className="text-text-muted">
          {(discarded === 1 ? screen.discarded.one : screen.discarded.other).replace(
            '{count}',
            String(discarded),
          )}
        </p>
      ) : null}
      <ApplyForm
        text={screen}
        action={applyProposal.bind(null, clientId)}
        cancelHref={paths.page}
      />
    </Screen>
  );
}
