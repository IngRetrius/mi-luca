import type { IsoDate } from '@miluca/domain';

/** Días hasta la fecha límite de las tareas de una propuesta: la primera revisión del protocolo. */
export const TASK_DUE_DAYS = 30;

export interface TaskText {
  readonly taskTitle: string;
  readonly taskTitleNoFrequency: string;
  readonly taskTitleRemove: string;
  readonly frequencies: Readonly<Record<string, string>>;
}

export interface TaskAdjustment {
  readonly kind: 'ajustar' | 'quitar';
  readonly amount: number | null;
  readonly currency: string;
  readonly concept: string;
  readonly frequency: string | null;
  readonly reason: string | null;
}

/** Una tarea como la recibe `apply_proposal`. */
export interface ProposalTask {
  readonly title: string;
  readonly note: string;
  readonly due_date: IsoDate;
  readonly sort_order: number;
}

/** Suma días a una fecha "AAAA-MM-DD", sin depender de la zona horaria. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * Una tarea para el cliente por ajuste aceptado (ADR 0024): qué hacer, con el porqué como nota. Los
 * textos quedan fijos en el idioma de quien aplica, como las tareas sugeridas.
 */
export function proposalTasks(
  adjustments: readonly TaskAdjustment[],
  text: TaskText,
  money: (amount: number, currency: string) => string,
  dueDate: IsoDate,
): ProposalTask[] {
  return adjustments.map((adjustment, index) => {
    const frequency = adjustment.frequency ? text.frequencies[adjustment.frequency] : undefined;
    const title =
      adjustment.kind === 'quitar' || adjustment.amount === null
        ? text.taskTitleRemove.replace('{concept}', adjustment.concept)
        : (frequency ? text.taskTitle : text.taskTitleNoFrequency)
            .replace('{concept}', adjustment.concept)
            .replace('{amount}', money(adjustment.amount, adjustment.currency))
            .replace('{frequency}', frequency?.toLocaleLowerCase() ?? '');
    return { title, note: adjustment.reason ?? '', due_date: dueDate, sort_order: index };
  });
}
