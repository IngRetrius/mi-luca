import Link from 'next/link';
import { notFound } from 'next/navigation';

import { COUNTRY_LOCALES, formatDate, formatMoney, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen, ScreenActions } from '@/components/screen';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText, percentToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';

import { deleteGoal, saveGoal } from './actions';
import { GoalForm } from './goal-form';
import { goalPaths } from './paths';
import { TRIP_CONCEPTS, type TripConcept, type TripItemValues } from './validation';

const t = messages.es;
const text = t.goals;

/** Textos según quién mira: el asesor habla del cliente; el cliente, en su trato. */
function localText(viewer: CaseEditor) {
  if (viewer.role === 'advisor') {
    return { title: text.title, intro: text.intro, back: text.back, empty: text.empty };
  }
  return withAddress(text.client, viewer.formOfAddress);
}

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** Metas (P-A10 y Mis datos): valor, fecha o repetición, aporte mensual y bolsillo de cada una. */
export async function GoalsScreen({ viewer, clientId }: { viewer: CaseEditor; clientId: string }) {
  const paths = goalPaths(viewer.role, clientId);
  const local = localText(viewer);
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        {loadError(paths.list)}
      </Screen>
    );
  }
  const { client, goals, pockets } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const pocketName = new Map(pockets.map((pocket) => [pocket.id, pocket.name]));
  const results = computed.result.goals;

  return (
    <Screen>
      {header}
      {goals.length === 0 ? (
        <p className="text-text-muted">{local.empty}</p>
      ) : (
        <>
          <FigureList
            figures={[{ label: text.monthlyTotal, value: money(results.monthlyTotal) }]}
          />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {goals.map((goal, index) => {
              const result = results.rows[index];
              const when =
                goal.repeat_every_years !== null
                  ? goal.repeat_every_years === 1
                    ? text.repeats.one
                    : text.repeats.other.replace(
                        '{years}',
                        amountToText(goal.repeat_every_years, locale, 1),
                      )
                  : goal.target_date
                    ? text.byDate.replace('{date}', formatDate(goal.target_date, locale, 'UTC'))
                    : null;
              const pocket = goal.pocket_id ? pocketName.get(goal.pocket_id) : null;
              return (
                <li key={goal.id}>
                  <Link
                    href={paths.item(goal.id)}
                    className={`flex min-h-12 items-start justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium wrap-anywhere">{goal.name}</span>
                      <span className="text-sm text-text-muted">
                        {[
                          text.value.replace('{amount}', money(result?.usedAmount ?? 0)),
                          when,
                          goal.uses_trip_calculator ? text.trip : null,
                          pocket,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {pocket ? null : <span className="text-sm">{text.noPocket}</span>}
                    </span>
                    <span className="shrink-0 text-right font-medium tabular-nums">
                      {text.monthly.replace('{amount}', money(result?.monthlyContribution ?? 0))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {goals.some((goal) => goal.repeat_every_years !== null && goal.already_saved > 0) ? (
            <p className="text-sm text-text-muted">{text.repeatNote}</p>
          ) : null}
        </>
      )}
      <ScreenActions>
        <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
          {text.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}

/** Crear (`goalId` null) o editar una meta. */
export async function GoalFormScreen({
  viewer,
  clientId,
  goalId,
}: {
  viewer: CaseEditor;
  clientId: string;
  goalId: string | null;
}) {
  const paths = goalPaths(viewer.role, clientId);
  const local = localText(viewer);
  const title = goalId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(goalId ? paths.item(goalId) : paths.add)}
      </Screen>
    );
  }
  const row = goalId ? computed.rows.goals.find((goal) => goal.id === goalId) : null;
  if (goalId && !row) notFound();
  const { client, fxRates, pockets, tripItems } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const saved = tripItems.filter((item) => item.goal_id === goalId);
  const items = Object.fromEntries(
    TRIP_CONCEPTS.map(({ key, quantity }) => {
      const item = saved.find((entry) => entry.concept === key);
      return [
        key,
        {
          unit: amountToText(item?.unit_value ?? null, locale),
          quantity: amountToText(item?.quantity ?? quantity, locale),
        },
      ];
    }),
  ) as Record<TripConcept, TripItemValues>;

  return (
    <Screen>
      <BackLink href={paths.list} label={local.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <GoalForm
        text={text.form}
        concepts={text.concepts}
        baseCurrency={client.base_currency}
        initial={{
          name: row?.name ?? '',
          pocketId: row?.pocket_id ?? '',
          amount: amountToText(row?.amount ?? null, locale),
          currency: row?.currency ?? client.base_currency,
          alreadySaved: row?.already_saved ? amountToText(row.already_saved, locale) : '',
          repeatEveryYears: amountToText(row?.repeat_every_years ?? null, locale, 1),
          targetDate: row?.target_date ?? '',
          usesTrip: row?.uses_trip_calculator ?? false,
          tripCurrency: row?.trip_currency ?? fxRates[0]?.currency ?? client.base_currency,
          tripLodgingTax: row?.trip_lodging_tax_rate
            ? percentToText(row.trip_lodging_tax_rate, locale)
            : '',
          tripCushion:
            row && row.trip_cushion_rate !== 0.05
              ? percentToText(row.trip_cushion_rate, locale)
              : '',
          tripBaseCosts: row?.trip_base_costs ? amountToText(row.trip_base_costs, locale) : '',
          tripItems: items,
          note: row?.note ?? '',
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        pockets={pockets
          .filter((pocket) => pocket.kind === 'general')
          .map((pocket) => ({ id: pocket.id, name: pocket.name }))}
        action={saveGoal.bind(null, clientId, goalId)}
        deleteAction={goalId ? deleteGoal.bind(null, clientId, goalId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
