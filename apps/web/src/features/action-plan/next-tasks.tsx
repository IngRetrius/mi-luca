import Link from 'next/link';

import { isOverdue } from '@miluca/engine';
import { formatDate } from '@miluca/i18n';

import { StatusLabel } from '@/components/status';
import { focusRing, linkButton, textButton } from '@/components/ui-classes';
import { withAddress, type FormOfAddress } from '@/lib/address';
import { todayIn } from '@/lib/dates';
import { getLocale, getMessages } from '@/server/i18n';

import type { ActionItemRow } from './queries';

/** Cuántas tareas pendientes se ven en el inicio y en Mi plan (P-C04, P-C05). */
export const NEXT_TASKS = 3;

/** Las próximas tareas pendientes del plan de acción, de la lista completa que llega del servidor. */
export function pendingTasks(items: readonly ActionItemRow[] | null): readonly ActionItemRow[] {
  return (items ?? []).filter((item) => item.status !== 'hecho').slice(0, NEXT_TASKS);
}

/**
 * Las próximas tareas pendientes del plan de acción, con su fecha límite y si está vencida. Las ve el
 * cliente en su inicio y en Mi plan, debajo del mensaje del asesor (ADR 0028).
 */
export async function NextTasks({
  tasks,
  formOfAddress,
  countryCode,
}: {
  tasks: readonly ActionItemRow[];
  formOfAddress: FormOfAddress;
  countryCode: string;
}) {
  const t = await getMessages();
  const text = withAddress(t.clientHome, formOfAddress);
  const locale = await getLocale(countryCode);
  const today = todayIn(countryCode);
  return (
    <section aria-labelledby="next-tasks-title" className="flex w-full flex-col gap-2 text-left">
      <h2 id="next-tasks-title" className="font-semibold">
        {text.tasksTitle}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/tareas/${task.id}`}
              className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
            >
              <span className="font-medium wrap-anywhere">{task.title}</span>
              {task.due_date ? (
                <span className="text-sm text-text-muted">
                  {text.dueOn.replace('{date}', formatDate(task.due_date, locale, 'UTC'))}
                </span>
              ) : null}
              {isOverdue({ dueDate: task.due_date, status: 'pendiente' }, today) ? (
                <StatusLabel status="alert" label={text.overdue} />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/tareas" className={`self-start ${textButton} ${linkButton}`}>
        {text.tasksLink}
      </Link>
    </section>
  );
}
