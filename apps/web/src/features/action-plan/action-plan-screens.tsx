import Link from 'next/link';
import { notFound } from 'next/navigation';

import { actionStatusSchema } from '@miluca/domain';
import { isOverdue, suggestedActions } from '@miluca/engine';
import { formatDate, type Messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { RowSubmitButton } from '@/components/row-submit-button';
import { Screen, ScreenActions } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { SubmitButton } from '@/components/submit-button';
import { focusRing, linkButton, primaryButton, textButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { todayIn } from '@/lib/dates';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { ActionItemForm } from './action-item-form';
import {
  addSuggestedActions,
  deleteActionItem,
  saveActionItem,
  setActionItemDone,
} from './actions';
import { actionPlanPaths } from './paths';
import { loadActionItems, type ActionItemRow } from './queries';
import { suggestionContext } from './suggestions';

const FILTERS = ['pendientes', 'hechas', 'todas'] as const;
type Filter = (typeof FILTERS)[number];

function parseFilter(value: unknown): Filter {
  return FILTERS.find((filter) => filter === value) ?? 'pendientes';
}

function localText(t: Messages, viewer: CaseEditor) {
  const text = t.actionPlan;
  if (viewer.role === 'advisor') {
    return { title: text.title, intro: text.intro, back: text.back, empty: text.empty };
  }
  return withAddress(text.client, viewer.formOfAddress);
}

/** Línea de la tarea: responsable, prioridad y fecha límite (o cuándo se hizo). */
function itemMeta(
  t: Messages,
  item: ActionItemRow,
  date: (value: string) => string,
  countryCode: string,
): string {
  const text = t.actionPlan;
  const parts = [
    text.owners[item.owner_role as keyof typeof text.owners] ?? item.owner_role,
    text.priorityLabel.replace(
      '{priority}',
      (
        text.priorities[item.priority as keyof typeof text.priorities] ?? item.priority
      ).toLowerCase(),
    ),
  ];
  if (item.status === 'hecho' && item.completed_at) {
    // El día en que se marcó, en el país del cliente.
    const day = todayIn(countryCode, new Date(item.completed_at));
    parts.push(text.doneOn.replace('{date}', date(day)));
  } else {
    parts.push(item.due_date ? text.due.replace('{date}', date(item.due_date)) : text.noDue);
  }
  return parts.join(' · ');
}

/** P-C09 Tareas (cliente) y plan de acción del asesor: lista con filtro y marca de hecha. */
export async function ActionPlanScreen({
  viewer,
  clientId,
  searchParams,
}: {
  viewer: CaseEditor;
  clientId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getMessages();
  const text = t.actionPlan;
  const paths = actionPlanPaths(viewer.role, clientId);
  const local = localText(t, viewer);
  const advisor = viewer.role === 'advisor';
  const filter = parseFilter(searchParams.ver);
  const [computed, items] = await Promise.all([
    loadComputedCase(clientId),
    loadActionItems(clientId),
  ]);
  const header = (
    <>
      <BackLink href={paths.back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!computed || !items) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.list}
        />
      </Screen>
    );
  }

  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  const today = todayIn(client.country_code);
  const date = (value: string) => formatDate(value, locale, 'UTC');
  const visible = items.filter((item) =>
    filter === 'todas' ? true : (item.status === 'hecho') === (filter === 'hechas'),
  );
  const existing = new Set(items.map((item) => item.suggestion_key));
  const missing = advisor
    ? suggestedActions(computed.input.cutoffDate, suggestionContext(computed)).filter(
        (action) => !existing.has(action.key),
      ).length
    : 0;

  return (
    <Screen>
      {header}
      {items.length === 0 ? (
        <p className="text-text-muted">{local.empty}</p>
      ) : (
        <>
          <nav aria-label={text.filterLabel} className="flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <Link
                key={option}
                href={paths.filtered(option)}
                aria-current={option === filter ? 'page' : undefined}
                className={`inline-flex min-h-12 items-center rounded-xl border px-4 ${
                  option === filter
                    ? 'border-primary bg-surface font-medium'
                    : 'border-border hover:border-text-muted'
                } ${focusRing}`}
              >
                {text.filters[option]}
              </Link>
            ))}
          </nav>
          {visible.length === 0 ? (
            <p className="text-text-muted">{text.emptyFilter}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {visible.map((item) => {
                const done = item.status === 'hecho';
                const overdue = isOverdue(
                  {
                    dueDate: item.due_date,
                    status: actionStatusSchema.catch('pendiente').parse(item.status),
                  },
                  today,
                );
                const describedBy = `task-${item.id}`;
                return (
                  <li key={item.id} className="flex flex-col gap-3 p-4">
                    <div id={describedBy} className="flex flex-col gap-1">
                      <span
                        className={`font-medium wrap-anywhere ${done ? 'text-text-muted line-through' : ''}`}
                      >
                        {item.title}
                      </span>
                      <span className="text-sm text-text-muted">
                        {itemMeta(t, item, date, client.country_code)}
                      </span>
                      {overdue ? <StatusLabel status="alert" label={text.overdue} /> : null}
                      {item.status === 'en_curso' ? (
                        <span className="text-sm font-medium">{text.statuses.en_curso}</span>
                      ) : null}
                      {item.note ? (
                        <span className="text-sm wrap-anywhere">{item.note}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={setActionItemDone.bind(null, clientId, item.id, !done)}>
                        <RowSubmitButton
                          label={done ? text.reopen : text.markDone}
                          pendingLabel={text.working}
                          describedBy={describedBy}
                        />
                      </form>
                      <Link
                        href={paths.item(item.id)}
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
        </>
      )}
      {advisor ? (
        <ScreenActions>
          {missing > 0 ? (
            <form action={addSuggestedActions.bind(null, clientId)} className="flex flex-col gap-2">
              <p className="text-sm text-text-muted">
                {(missing === 1 ? text.addSuggestedHint.one : text.addSuggestedHint.other).replace(
                  '{count}',
                  String(missing),
                )}
              </p>
              <SubmitButton label={text.addSuggested} pendingLabel={text.addingSuggested} />
            </form>
          ) : null}
          <Link
            href={paths.add}
            className={`w-full ${missing > 0 ? textButton : primaryButton} ${linkButton}`}
          >
            {text.add}
          </Link>
        </ScreenActions>
      ) : (
        <div className="pb-8" />
      )}
    </Screen>
  );
}

/** Crear (`itemId` null, solo el asesor) o editar una tarea. */
export async function ActionItemFormScreen({
  viewer,
  clientId,
  itemId,
}: {
  viewer: CaseEditor;
  clientId: string;
  itemId: string | null;
}) {
  const t = await getMessages();
  const text = t.actionPlan;
  const paths = actionPlanPaths(viewer.role, clientId);
  const local = localText(t, viewer);
  const advisor = viewer.role === 'advisor';
  const title = itemId ? text.form.editTitle : text.form.newTitle;
  const items = await loadActionItems(clientId);
  if (!items) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={itemId ? paths.item(itemId) : paths.add}
        />
      </Screen>
    );
  }
  const item = itemId ? items.find((row) => row.id === itemId) : null;
  if ((itemId && !item) || (!itemId && !advisor)) notFound();

  return (
    <Screen>
      <BackLink href={paths.list} label={local.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      {!advisor && item ? <p className="-mt-2 text-lg wrap-anywhere">{item.title}</p> : null}
      <ActionItemForm
        text={{
          form: text.form,
          priorities: text.priorities,
          owners: text.owners,
          statuses: text.statuses,
        }}
        initial={{
          title: item?.title ?? '',
          priority: item?.priority ?? 'media',
          owner: item?.owner_role ?? 'cliente',
          dueDate: item?.due_date ?? '',
          status: item?.status ?? 'pendiente',
          note: item?.note ?? '',
        }}
        advisor={advisor}
        action={saveActionItem.bind(null, clientId, itemId)}
        deleteAction={advisor && itemId ? deleteActionItem.bind(null, clientId, itemId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
