import { DIAGNOSIS_HORIZON_MONTHS, type DebtSimulation } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

/** "marzo de 2027" a partir del primer día del mes. */
export function formatMonth(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Cuándo sale una deuda del plan de pago: el mes y los meses, o por qué no sale. */
export function payoffText(
  t: Messages,
  debt: DebtSimulation['debts'][number],
  locale: string,
): string {
  const text = t.debts;
  if (debt.exceedsHorizon) {
    return text.plan.exceeds.replace('{months}', String(DIAGNOSIS_HORIZON_MONTHS));
  }
  if (debt.monthsToPayoff === 0) return text.plan.payoffLumpSum;
  const month = formatMonth(debt.payoffDate ?? '', locale);
  return debt.monthsToPayoff === 1
    ? text.plan.payoffOne.replace('{month}', month)
    : text.plan.payoff
        .replace('{month}', month)
        .replace('{months}', String(debt.monthsToPayoff ?? ''));
}

/** La salida de la deuda cara: el mes, "más de 120 meses" o que no hay deuda cara. */
export function expensivePayoffText(
  t: Messages,
  payoff: { readonly exceedsHorizon: boolean; readonly date: string | null } | null,
  locale: string,
): string {
  const text = t.debts.plan;
  if (payoff === null) return text.noExpensive;
  if (payoff.exceedsHorizon || payoff.date === null) {
    return text.expensivePayoffExceeds.replace('{months}', String(DIAGNOSIS_HORIZON_MONTHS));
  }
  return formatMonth(payoff.date, locale);
}
