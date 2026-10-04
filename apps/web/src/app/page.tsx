import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isOverdue } from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, messages } from '@miluca/i18n';

import { StatusLabel } from '@/components/status';
import {
  focusRing,
  linkButton,
  primaryButton,
  secondaryButton,
  textButton,
} from '@/components/ui-classes';
import { loadActionItems, type ActionItemRow } from '@/features/action-plan';
import { SignOutButton } from '@/features/auth';
import { listDeliveries } from '@/features/deliveries';
import { withAddress, type FormOfAddress } from '@/lib/address';
import { todayIn } from '@/lib/dates';
import { homePath, requireViewer } from '@/server/viewer';

const t = messages.es;
// El nombre va aparte para marcarlo como no traducible.
const [greetingBefore, greetingAfter] = t.clientHome.greeting.split('{name}');

// Cuántas tareas pendientes se ven en el inicio (P-C04).
const NEXT_TASKS = 3;

/**
 * Inicio: cada rol va a su pantalla; el cliente ve aquí su inicio (P-C04). Hasta la entrega dice
 * que el asesor prepara el plan; después lleva a Mi plan. Siempre puede registrar el gasto del mes
 * y, si el asesor agregó tareas, ve las próximas.
 */
export default async function HomePage() {
  const viewer = await requireViewer();
  if (viewer.role !== 'client') redirect(homePath(viewer));
  const [deliveries, actionItems] = await Promise.all([
    listDeliveries(viewer.clientId),
    loadActionItems(viewer.clientId),
  ]);
  const delivered = (deliveries?.length ?? 0) > 0;
  const nextTasks = (actionItems ?? [])
    .filter((item) => item.status !== 'hecho')
    .slice(0, NEXT_TASKS);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Image src="/icons/icon-192.png" alt="" width={96} height={96} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-balance wrap-anywhere">
          {greetingBefore}
          <span translate="no">{viewer.displayName}</span>
          {greetingAfter}
        </h1>
        <p className="text-lg text-text-muted">
          {delivered
            ? t.myPlan.ready[viewer.formOfAddress]
            : t.clientHome.preparing[viewer.formOfAddress]}
        </p>
      </div>
      {delivered ? (
        <Link href="/mi-plan" className={`w-full ${primaryButton} ${linkButton}`}>
          {t.myPlan.link[viewer.formOfAddress]}
        </Link>
      ) : null}
      <Link href="/control-mensual" className={`w-full ${secondaryButton} ${linkButton}`}>
        {t.clientHome.spendingLink}
      </Link>
      {nextTasks.length > 0 ? (
        <NextTasks
          tasks={nextTasks}
          formOfAddress={viewer.formOfAddress}
          countryCode={viewer.countryCode}
        />
      ) : null}
      <Link href="/mis-datos" className={`inline-flex items-center ${textButton}`}>
        {t.myData.link}
      </Link>
      <Link href="/privacidad-y-datos" className={`inline-flex items-center ${textButton}`}>
        {t.clientHome.privacyLink}
      </Link>
      <SignOutButton />
      <p className="text-sm text-text-muted">{t.scope.notInvestmentAdvice}</p>
    </main>
  );
}

/** Las próximas tareas pendientes del plan de acción, con su fecha límite y si está vencida. */
function NextTasks({
  tasks,
  formOfAddress,
  countryCode,
}: {
  tasks: readonly ActionItemRow[];
  formOfAddress: FormOfAddress;
  countryCode: string;
}) {
  const text = withAddress(t.clientHome, formOfAddress);
  const locale = COUNTRY_LOCALES[countryCode]?.locale ?? 'es';
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
