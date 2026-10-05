import Link from 'next/link';

import { formatDate, messages } from '@miluca/i18n';

import { RowSubmitButton } from '@/components/row-submit-button';
import { StatusLabel } from '@/components/status';
import { SubmitButton } from '@/components/submit-button';
import { linkButton, textButton } from '@/components/ui-classes';
import { actionPlanPaths, type ActionItemRow } from '@/features/action-plan';
import { todayIn } from '@/lib/dates';

import { scheduleReviews, setReviewDone } from './actions';
import type { Review } from './reviews';

const t = messages.es;
const text = t.followUp.reviews;

function StateText({
  review,
  date,
  countryCode,
}: {
  review: Review<ActionItemRow>;
  date: (day: string) => string;
  countryCode: string;
}) {
  const { task, state } = review;
  if (!task || state === 'sin_programar') {
    return <span className="text-sm text-text-muted">{text.states.sin_programar}</span>;
  }
  if (state === 'hecha') {
    // El día en que se marcó, en el país del cliente.
    const day = task.completed_at ? todayIn(countryCode, new Date(task.completed_at)) : null;
    return (
      <StatusLabel
        status="ok"
        label={day ? text.states.hecha.replace('{date}', date(day)) : t.actionPlan.statuses.hecho}
      />
    );
  }
  if (state === 'vencida' && task.due_date) {
    return (
      <StatusLabel
        status="alert"
        label={text.states.vencida.replace('{date}', date(task.due_date))}
      />
    );
  }
  return (
    <span className="text-sm font-medium">
      {task.due_date
        ? text.states.programada.replace('{date}', date(task.due_date))
        : text.states.programadaNoDate}
    </span>
  );
}

/**
 * Revisiones a 30 días, 90 días y anual (fase 12 del protocolo): qué revisar en cada una y su tarea
 * del plan de acción, para marcarla o abrirla. Las que faltan se programan con un botón.
 */
export function ReviewsSection({
  clientId,
  list,
  locale,
  countryCode,
}: {
  clientId: string;
  list: readonly Review<ActionItemRow>[];
  locale: string;
  countryCode: string;
}) {
  const date = (day: string) => formatDate(day, locale, 'UTC');
  const taskPath = actionPlanPaths('advisor', clientId).item;
  const missing = list.some((review) => review.task === null);
  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-2">
      <h2 id="reviews-title" className="font-semibold">
        {text.title}
      </h2>
      <p className="text-sm text-text-muted">{text.intro}</p>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {list.map((review) => {
          const describedBy = `review-${review.key}`;
          const done = review.state === 'hecha';
          return (
            <li key={review.key} className="flex flex-col gap-3 p-4">
              <div id={describedBy} className="flex flex-col gap-1">
                <h3 className="font-medium">{text.items[review.key].title}</h3>
                <StateText review={review} date={date} countryCode={countryCode} />
              </div>
              <p className="text-sm text-text-muted">{text.items[review.key].checks}</p>
              {review.task ? (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={setReviewDone.bind(null, clientId, review.task.id, !done)}>
                    <RowSubmitButton
                      label={done ? t.actionPlan.reopen : t.actionPlan.markDone}
                      pendingLabel={t.actionPlan.working}
                      describedBy={describedBy}
                    />
                  </form>
                  <Link
                    href={taskPath(review.task.id)}
                    aria-describedby={describedBy}
                    className={`${textButton} ${linkButton}`}
                  >
                    {text.openTask}
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {missing ? (
        <form action={scheduleReviews.bind(null, clientId)}>
          <SubmitButton label={text.schedule} pendingLabel={text.scheduling} />
        </form>
      ) : null}
      <div className="flex flex-col gap-1 pt-2">
        <h3 className="font-medium">{text.lifeEventsTitle}</h3>
        <p className="text-sm">{text.lifeEvents}</p>
      </div>
    </section>
  );
}
