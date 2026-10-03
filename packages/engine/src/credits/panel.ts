import type { IsoDate } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import { excelSerial, parseIsoDate, round } from '../excel';
import type { CreditsPaymentPlan, TrackedCredit } from './payment-plan';

/** Años de la tabla "Deuda año por año": el del primer mes y los 30 siguientes. */
const PANEL_YEARS = 31;
// Una cuota a 7 días o menos se paga esta semana. @excel Panel!F25
const THIS_WEEK_DAYS = 7;

export type DebtLoadLevel = 'sana' | 'alta' | 'muy_alta' | 'critica';
export type CalendarStatus = 'vencida' | 'esta_semana' | 'al_dia';

export interface CreditsPanel {
  /** @excel Panel!B5 */
  readonly totalDebt: number;
  /** Lo que se paga el próximo mes: la próxima cuota de cada crédito. @excel Panel!D5 */
  readonly nextPayments: number;
  /** @excel Panel!F5 */
  readonly pendingInterest: number;
  /** Frente al monto original de cada crédito (o su saldo inicial). @excel Panel!H5 */
  readonly principalPaidShare: number;
  /** Fin de la última deuda con el plan; null si alguna pasa de 360 meses o no hay. @excel Panel!J5 */
  readonly debtFree: { readonly date: IsoDate | null; readonly exceedsHorizon: boolean } | null;
  /** @excel Panel!L5 */
  readonly overdueCount: number;
  /** Pagos del próximo mes sobre el ingreso mensual; null sin ingreso. @excel Datos!C21 */
  readonly debtLoad: number | null;
  /** @excel Datos!D21 */
  readonly debtLoadLevel: DebtLoadLevel | null;
  /** Próxima cuota de cada crédito, por fecha. @excel Panel!B25:F32 */
  readonly calendar: readonly {
    readonly creditIndex: number;
    readonly date: IsoDate;
    readonly amount: number;
    readonly day: number;
    readonly status: CalendarStatus;
  }[];
  /** Lo que hay que tener en la cuenta para los días 1 a 10, 11 a 20 y 21 a 31. @excel Panel!K25:K28 */
  readonly monthSegments: readonly [number, number, number];
  /** Abono extra del primer mes del plan, por orden de pago. @excel Panel!G36:I43 */
  readonly suggestedExtras: readonly { readonly creditIndex: number; readonly amount: number }[];
  /** Cuándo termina cada crédito y cuánto se libera, por fecha. @excel Panel!B48:G55 */
  readonly milestones: readonly {
    readonly creditIndex: number;
    readonly endDate: IsoDate;
    /** La cuota que se libera. @excel Panel!D48 */
    readonly freedPayment: number;
    /** Las cuotas que quedan después. @excel Panel!E48 */
    readonly paymentAfter: number;
    /** @excel Panel!F48 */
    readonly yearsFromCutoff: number;
    /** @excel Panel!G48 */
    readonly loadAfter: number | null;
  }[];
  /** @excel Panel!B60:F90 */
  readonly byYear: readonly {
    readonly year: number;
    /** Deuda al cierre de diciembre con el plan. */
    readonly debtWithPlan: number;
    readonly debtMinimumOnly: number;
    readonly paymentsWithPlan: number;
    /** Pago promedio de los meses del año sobre el ingreso; null sin ingreso o sin pagos. */
    readonly averageLoad: number | null;
  }[];
}

/** @excel Datos!D21 */
function loadLevel(load: number): DebtLoadLevel {
  if (load <= 0.3) return 'sana';
  if (load <= 0.4) return 'alta';
  if (load <= 0.5) return 'muy_alta';
  return 'critica';
}

/**
 * Panel de la plantilla de créditos: totales de hoy, calendario del mes, abono sugerido, hitos y
 * deuda año por año. El ingreso mensual sale del caso (una sola fuente de ingresos, H-23); en la
 * plantilla es `Datos!F16`. Importes en moneda base.
 *
 * @excel Panel!B5:L5, B25:K33, G36:I43, B48:G55, B60:F90; Datos!C20:D21
 */
export function creditsPanel(
  credits: readonly TrackedCredit[],
  plan: CreditsPaymentPlan,
  cutoffDate: IsoDate,
  monthlyIncome: number,
  fx: FxContext,
): CreditsPanel {
  const base = (amount: number, index: number) =>
    toBaseCompat({ amount, currency: credits[index]!.currency }, fx);
  const sum = (pick: (credit: TrackedCredit, index: number) => number) =>
    credits.reduce((total, credit, index) => total + pick(credit, index), 0);

  const totalDebt = sum((c, i) => base(c.schedule.currentBalance, i));
  const nextPayments = sum((c, i) => base(c.schedule.next?.clientPays ?? 0, i));
  const originalTotal = sum((c, i) =>
    base((c.credit.originalAmount ?? 0) > 0 ? c.credit.originalAmount! : c.credit.balance, i),
  );
  const ordered = plan.rows.filter((row) => row.order !== null);
  const ratio = (amount: number) => (monthlyIncome === 0 ? null : amount / monthlyIncome);
  const debtLoad = ratio(nextPayments);

  // Desempate como la plantilla: a igual fecha va primero el crédito de arriba (`+k/100`).
  const byDate = <T extends { creditIndex: number; date: IsoDate }>(a: T, b: T) =>
    a.date === b.date ? a.creditIndex - b.creditIndex : a.date < b.date ? -1 : 1;
  const cutoff = excelSerial(cutoffDate);
  const calendar = credits
    .flatMap((credit, creditIndex) => {
      const next = credit.schedule.next;
      return next?.date
        ? [{ creditIndex, date: next.date, amount: base(next.clientPays, creditIndex) }]
        : [];
    })
    .sort(byDate)
    .map((entry) => {
      const days = excelSerial(entry.date) - cutoff;
      return {
        ...entry,
        day: parseIsoDate(entry.date).day,
        status: (days < 0
          ? 'vencida'
          : days <= THIS_WEEK_DAYS
            ? 'esta_semana'
            : 'al_dia') as CalendarStatus,
      };
    });
  const segment = (from: number, to: number) =>
    calendar.reduce(
      (total, entry) => (entry.day >= from && entry.day <= to ? total + entry.amount : total),
      0,
    );

  // Las cuotas completas de los créditos abiertos (`'Plan de pago'!F12:F19` con saldo).
  const openPayments = sum((c, i) =>
    c.schedule.currentBalance > 0.5 ? base(c.schedule.payment, i) : 0,
  );
  let freed = 0;
  const milestones = credits
    .flatMap((credit, creditIndex) =>
      credit.schedule.endDate && !credit.schedule.exceedsHorizon
        ? [{ creditIndex, date: credit.schedule.endDate }]
        : [],
    )
    .sort(byDate)
    .map(({ creditIndex, date }) => {
      const freedPayment = base(credits[creditIndex]!.schedule.payment, creditIndex);
      freed += freedPayment;
      const paymentAfter = Math.max(0, openPayments - freed);
      return {
        creditIndex,
        endDate: date,
        freedPayment,
        paymentAfter,
        yearsFromCutoff: round((excelSerial(date) - cutoff) / 365.25, 1),
        loadAfter: ratio(paymentAfter),
      };
    });

  const firstYear = parseIsoDate(plan.startMonth).year;
  const months = plan.simulation.months;
  const byYear = Array.from({ length: PANEL_YEARS }, (_, offset) => {
    const year = firstYear + offset;
    const december = months.indexOf(`${year}-12-01`);
    const inYear = months.flatMap((month, index) => (month.startsWith(`${year}-`) ? [index] : []));
    const paymentsWithPlan = inYear.reduce(
      (total, index) => total + plan.paymentWithPlan[index]!,
      0,
    );
    return {
      year,
      debtWithPlan: december === -1 ? 0 : plan.debtWithPlan[december]!,
      debtMinimumOnly: december === -1 ? 0 : plan.debtMinimumOnly[december]!,
      paymentsWithPlan,
      averageLoad:
        monthlyIncome === 0 || paymentsWithPlan === 0
          ? null
          : paymentsWithPlan / inYear.length / monthlyIncome,
    };
  });

  const ends = ordered.map((row) => row.endWithPlan);
  return {
    totalDebt,
    nextPayments,
    pendingInterest: sum((c, i) => base(c.schedule.pendingInterest, i)),
    principalPaidShare: originalTotal === 0 ? 0 : 1 - totalDebt / originalTotal,
    debtFree:
      ordered.length === 0
        ? null
        : ordered.some((row) => row.withPlanExceedsHorizon)
          ? { date: null, exceedsHorizon: true }
          : {
              date: ends.reduce<IsoDate | null>(
                (a, b) => (b !== null && (a === null || b > a) ? b : a),
                null,
              ),
              exceedsHorizon: false,
            },
    overdueCount: sum((c) => c.schedule.overdueCount),
    debtLoad,
    debtLoadLevel: debtLoad === null ? null : loadLevel(debtLoad),
    calendar,
    monthSegments: [segment(1, 10), segment(11, 20), segment(21, 31)],
    suggestedExtras: plan.simulation.byOrder.map((row) => ({
      creditIndex: row.debtIndex,
      amount: row.extra[0] ?? 0,
    })),
    milestones,
    byYear,
  };
}
