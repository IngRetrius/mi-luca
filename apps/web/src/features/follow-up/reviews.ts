import type { IsoDate } from '@miluca/domain';
import { isOverdue, type ActionTemplateKey } from '@miluca/engine';

/**
 * Las revisiones de la fase 12 del protocolo (30 días, 90 días y anual) son las tareas sugeridas
 * del plan de acción con estas llaves (ADR 0021): no hay otra tabla de revisiones.
 */
export const REVIEW_KEYS = [
  'review_30_days',
  'review_90_days',
  'annual_review',
] as const satisfies readonly ActionTemplateKey[];

export type ReviewKey = (typeof REVIEW_KEYS)[number];

/** Sin programar: el cliente no tiene la tarea. Programada incluye la que no tiene fecha. */
export type ReviewState = 'sin_programar' | 'programada' | 'vencida' | 'hecha';

/** Lo que se usa de una tarea del plan de acción (`action_items`), como llega de la base. */
export interface ReviewTask {
  readonly id: string;
  readonly suggestion_key: string | null;
  readonly due_date: IsoDate | null;
  readonly status: string;
  readonly completed_at: string | null;
}

export interface Review<T extends ReviewTask> {
  readonly key: ReviewKey;
  readonly task: T | null;
  readonly state: ReviewState;
}

function isReviewKey(key: string | null): key is ReviewKey {
  return (REVIEW_KEYS as readonly (string | null)[]).includes(key);
}

/** Las tres revisiones en orden, con su tarea y su estado en la fecha dada (hoy en el país). */
export function reviews<T extends ReviewTask>(tasks: readonly T[], today: IsoDate): Review<T>[] {
  return REVIEW_KEYS.map((key) => {
    const task = tasks.find((item) => item.suggestion_key === key) ?? null;
    const state: ReviewState = !task
      ? 'sin_programar'
      : task.status === 'hecho'
        ? 'hecha'
        : isOverdue({ dueDate: task.due_date, status: 'pendiente' }, today)
          ? 'vencida'
          : 'programada';
    return { key, task, state };
  });
}

/**
 * La próxima revisión: la de fecha más temprana entre las que no están hechas, aunque ya esté
 * vencida (sigue pendiente). Null si no hay ninguna con fecha.
 */
export function nextReview<T extends ReviewTask>(tasks: readonly T[]): T | null {
  let next: T | null = null;
  for (const task of tasks) {
    if (!isReviewKey(task.suggestion_key) || task.status === 'hecho' || !task.due_date) continue;
    if (!next?.due_date || task.due_date < next.due_date) next = task;
  }
  return next;
}
