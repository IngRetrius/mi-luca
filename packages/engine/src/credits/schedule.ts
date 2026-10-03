import type { IsoDate } from '@miluca/domain';

import { edate, nper, pmt } from '../excel';

/** Cuotas de la tabla de un crédito (RN-094: seguimiento a 360 meses). */
export const CREDIT_HORIZON_INSTALLMENTS = 360;

// Un saldo de medio peso o menos ya cuenta como pagado, como en la plantilla.
const PAID_OFF = 0.5;

/**
 * Un crédito del seguimiento cuota a cuota, con importes en su moneda. Las celdas son las de la
 * hoja "Crédito 1" de la plantilla de créditos.
 */
export interface CreditInput {
  /** Saldo al inicio de la tabla. @excel 'Crédito 1'!C9 */
  readonly balance: number;
  /** Fecha de la primera cuota de la tabla. @excel 'Crédito 1'!C10 */
  readonly firstInstallmentDate: IsoDate;
  /** Número de esa cuota (1 si el crédito es nuevo). @excel 'Crédito 1'!C11 */
  readonly firstInstallmentNumber: number;
  /** Plazo total en cuotas; con él se calcula la cuota si no se escribe. @excel 'Crédito 1'!C12 */
  readonly totalInstallments: number | null;
  /** Tasa efectiva anual; sin escribir vale 0. @excel 'Crédito 1'!C13 */
  readonly annualRate: number | null;
  /** Cuota mensual del banco, con seguros. @excel 'Crédito 1'!C14 */
  readonly payment: number | null;
  /** Seguros y cargos incluidos en la cuota (RN-096). @excel 'Crédito 1'!C15 */
  readonly insurance: number;
  /** @excel 'Crédito 1'!C16 */
  readonly originalAmount: number | null;
  /** @excel 'Crédito 1'!C17 */
  readonly acceptsExtra: boolean;
  /** Desde qué número de cuota acepta abonos extra. @excel 'Crédito 1'!C18 */
  readonly extraFromInstallment: number | null;
  /** FRECH: puntos de tasa efectiva anual que cubre el gobierno (0,04 son 4 puntos). @excel 'Crédito 1'!C19 */
  readonly frechPoints: number | null;
  /** FRECH: cobertura hasta este número de cuota. @excel 'Crédito 1'!C20 */
  readonly frechUntilInstallment: number | null;
}

/** Lo que el cliente marca en una cuota (RN-099). */
export interface InstallmentMark {
  /** Número de la cuota (el de la columna N.º cuota). */
  readonly installmentNumber: number;
  readonly paid: boolean;
  /** "Cuota distinta este mes". @excel 'Crédito 1'!I27:I386 */
  readonly customPayment: number | null;
  /** @excel 'Crédito 1'!J27:J386 */
  readonly extraPayment: number | null;
}

export type InstallmentStatus = 'pagada' | 'vencida' | 'proxima' | 'pendiente';

/** Una fila de la tabla. Importes en la moneda del crédito. */
export interface Installment {
  /** @excel 'Crédito 1'!B27 */
  readonly number: number;
  /** null cuando el crédito ya terminó. @excel 'Crédito 1'!C27 */
  readonly date: IsoDate | null;
  /** @excel 'Crédito 1'!D27 */
  readonly openingBalance: number;
  /** @excel 'Crédito 1'!E27 */
  readonly interest: number;
  /** @excel 'Crédito 1'!F27 */
  readonly insurance: number;
  /** @excel 'Crédito 1'!G27 */
  readonly frechSubsidy: number;
  /** @excel 'Crédito 1'!H27 */
  readonly scheduledPayment: number;
  /** Cuota más abono extra, sin pasar de lo que se debe. @excel 'Crédito 1'!K27 */
  readonly totalPayment: number;
  /** @excel 'Crédito 1'!L27 */
  readonly principal: number;
  /** @excel 'Crédito 1'!M27 */
  readonly closingBalance: number;
  /** Lo que paga el cliente: el pago menos el subsidio. @excel 'Crédito 1'!N27 */
  readonly clientPays: number;
  /** null en las filas sin pago (crédito terminado). @excel 'Crédito 1'!Q27 */
  readonly status: InstallmentStatus | null;
}

export interface CreditSchedule {
  /** @excel 'Crédito 1'!F7 */
  readonly monthlyRate: number;
  /** @excel 'Crédito 1'!F8 */
  readonly frechMonthlyRate: number;
  /** Cuota usada: la escrita o la calculada con el plazo, con seguros. @excel 'Crédito 1'!F9 */
  readonly payment: number;
  /** @excel 'Crédito 1'!F11 */
  readonly extraFromDate: IsoDate | null;
  readonly installments: readonly Installment[];
  /** Saldo menos el capital de las cuotas marcadas como pagadas. @excel 'Crédito 1'!I6 */
  readonly currentBalance: number;
  /** @excel 'Crédito 1'!I7 */
  readonly paidCount: number;
  /** La primera cuota sin marcar; null si no queda ninguna. @excel 'Crédito 1'!I8:I10, F13 */
  readonly next: {
    readonly number: number;
    readonly date: IsoDate | null;
    readonly clientPays: number;
  } | null;
  /** @excel 'Crédito 1'!I11 */
  readonly remainingCount: number;
  /** Fecha de la última cuota con pago; null si pasa de 360 cuotas. @excel 'Crédito 1'!I12 */
  readonly endDate: IsoDate | null;
  readonly exceedsHorizon: boolean;
  /** @excel 'Crédito 1'!I13 */
  readonly pendingInterest: number;
  /** @excel 'Crédito 1'!I14 */
  readonly pendingTotal: number;
  /** @excel 'Crédito 1'!I15 */
  readonly principalPaidShare: number;
  /** null sin plazo. @excel 'Crédito 1'!I16 */
  readonly installmentsPaidShare: number | null;
  /** Cuotas sin marcar con fecha anterior a la de corte (RN-099). @excel 'Crédito 1'!I17 */
  readonly overdueCount: number;
  /** @excel 'Crédito 1'!I19 */
  readonly state: 'pagado' | 'al_dia' | 'vencidas_sin_marcar';
}

/** Tasa mensual equivalente a una efectiva anual. */
function monthly(annualRate: number): number {
  return (1 + annualRate) ** (1 / 12) - 1;
}

/**
 * Tabla de un crédito cuota a cuota (RN-095, RN-096, RN-099): interés, seguros, subsidio FRECH,
 * cuota (la del banco o la calculada con el plazo), cuota distinta y abono extra de cada mes,
 * capital, saldo, lo que paga el cliente y el estado de cada cuota frente a la fecha de corte.
 * El saldo actual descuenta solo el capital de las cuotas marcadas como pagadas.
 *
 * @excel 'Crédito 1'!F7:F13, I6:I19, B27:S386
 */
export function creditSchedule(
  credit: CreditInput,
  marks: readonly InstallmentMark[],
  cutoffDate: IsoDate,
  horizon: number = CREDIT_HORIZON_INSTALLMENTS,
): CreditSchedule {
  const annualRate = credit.annualRate ?? 0;
  const monthlyRate = monthly(annualRate);
  const frechPoints = credit.frechPoints ?? 0;
  const frechMonthlyRate =
    frechPoints === 0 ? 0 : monthlyRate - monthly(Math.max(0, annualRate - frechPoints));
  const firstNumber = credit.firstInstallmentNumber;
  const periods = (credit.totalInstallments ?? 0) - firstNumber + 1;
  const payment =
    (credit.payment ?? 0) > 0
      ? credit.payment!
      : (credit.totalInstallments ?? 0) > 0 && credit.balance > 0 && periods > 0
        ? (monthlyRate === 0
            ? credit.balance / periods
            : pmt(monthlyRate, periods, credit.balance)) + credit.insurance
        : 0;
  const extraFromDate =
    !credit.acceptsExtra || !credit.extraFromInstallment
      ? null
      : edate(credit.firstInstallmentDate, credit.extraFromInstallment - firstNumber);
  const byNumber = new Map(marks.map((mark) => [mark.installmentNumber, mark]));

  const rows: Omit<Installment, 'status'>[] = [];
  const paid: boolean[] = [];
  let opening = credit.balance;
  for (let k = 0; k < horizon; k++) {
    const number = firstNumber + k;
    const mark = byNumber.get(number);
    const open = opening > PAID_OFF;
    const interest = opening * monthlyRate;
    const insurance = open ? credit.insurance : 0;
    const frechSubsidy =
      open && frechPoints > 0 && number <= (credit.frechUntilInstallment ?? 0)
        ? opening * frechMonthlyRate
        : 0;
    const owed = opening + interest + insurance;
    const custom = mark?.customPayment ?? 0;
    const scheduledPayment = open ? Math.min(custom > 0 ? custom : payment, owed) : 0;
    const totalPayment = open ? Math.min(scheduledPayment + (mark?.extraPayment ?? 0), owed) : 0;
    const principal = totalPayment - interest - insurance;
    const closingBalance = opening - principal;
    rows.push({
      number,
      date: open ? edate(credit.firstInstallmentDate, k) : null,
      openingBalance: opening,
      interest,
      insurance,
      frechSubsidy,
      scheduledPayment,
      totalPayment,
      principal,
      closingBalance,
      clientPays: totalPayment - frechSubsidy,
    });
    paid.push(totalPayment > 0 && (mark?.paid ?? false));
    opening = Math.max(0, closingBalance);
  }

  const pending = rows.map((row, index) => row.totalPayment > 0 && !paid[index]);
  const nextIndex = pending.indexOf(true);
  const installments: Installment[] = rows.map((row, index) => ({
    ...row,
    status:
      row.totalPayment === 0
        ? null
        : paid[index]
          ? 'pagada'
          : row.date !== null && row.date < cutoffDate
            ? 'vencida'
            : index === nextIndex
              ? 'proxima'
              : 'pendiente',
  }));

  const sumWhere = (pick: (row: Installment) => number, where: (index: number) => boolean) =>
    installments.reduce((sum, row, index) => (where(index) ? sum + pick(row) : sum), 0);
  const currentBalance = Math.max(
    0,
    credit.balance -
      sumWhere(
        (row) => row.principal,
        (index) => paid[index]!,
      ),
  );
  const paidCount = paid.filter(Boolean).length;
  const overdueCount = installments.filter(
    (row, index) => pending[index] && row.date !== null && row.date < cutoffDate,
  ).length;
  const remainingCount = pending.filter(Boolean).length;
  const exceedsHorizon = rows[horizon - 1]!.closingBalance > PAID_OFF;
  const datesWithPayment = installments.flatMap((row) =>
    row.totalPayment > 0 && row.date ? [row.date] : [],
  );
  const base = (credit.originalAmount ?? 0) > 0 ? credit.originalAmount! : credit.balance;

  return {
    monthlyRate,
    frechMonthlyRate,
    payment,
    extraFromDate,
    installments,
    currentBalance,
    paidCount,
    next:
      nextIndex === -1
        ? null
        : {
            number: installments[nextIndex]!.number,
            date: installments[nextIndex]!.date,
            clientPays: installments[nextIndex]!.clientPays,
          },
    remainingCount,
    endDate:
      exceedsHorizon || datesWithPayment.length === 0
        ? null
        : datesWithPayment.reduce((a, b) => (b > a ? b : a)),
    exceedsHorizon,
    pendingInterest: sumWhere(
      (row) => row.interest,
      (index) => pending[index]!,
    ),
    pendingTotal: sumWhere(
      (row) => row.clientPays,
      (index) => pending[index]!,
    ),
    principalPaidShare: base > 0 ? 1 - currentBalance / base : 0,
    installmentsPaidShare:
      (credit.totalInstallments ?? 0) === 0
        ? null
        : (firstNumber - 1 + paidCount) / credit.totalInstallments!,
    overdueCount,
    state: overdueCount > 0 ? 'vencidas_sin_marcar' : remainingCount === 0 ? 'pagado' : 'al_dia',
  };
}

export interface ExtraPaymentSimulation {
  /** Meses para terminar pagando la cuota más el extra; null si no alcanza. @excel 'Crédito 1'!F22 */
  readonly months: number | null;
  /** Intereses aproximados con ese pago. @excel 'Crédito 1'!G22 */
  readonly interest: number | null;
}

/**
 * Simulador "Si pagara este extra fijo cada mes" de la hoja del crédito, sobre el saldo actual.
 * Sin saldo o sin pago, null en los dos.
 *
 * @excel 'Crédito 1'!F22:G22
 */
export function simulateFixedExtra(
  schedule: CreditSchedule,
  insurance: number,
  extra: number,
): ExtraPaymentSimulation {
  const payment = schedule.payment - insurance + extra;
  const balance = schedule.currentBalance;
  if (balance <= 0 || payment <= 0) return { months: null, interest: null };
  const months =
    schedule.monthlyRate === 0 ? balance / payment : nper(schedule.monthlyRate, -payment, balance);
  return months === null
    ? { months: null, interest: null }
    : { months, interest: payment * months - balance };
}

/**
 * Simulador "Para terminar en este número de meses": la cuota necesaria, con seguros.
 *
 * @excel 'Crédito 1'!F23
 */
export function paymentToFinishIn(
  schedule: CreditSchedule,
  insurance: number,
  months: number,
): number | null {
  if (months <= 0 || schedule.currentBalance <= 0) return null;
  return (
    (schedule.monthlyRate === 0
      ? schedule.currentBalance / months
      : pmt(schedule.monthlyRate, months, schedule.currentBalance)) + insurance
  );
}

/** Lo que un crédito en seguimiento le pasa al inventario de deudas del diagnóstico. */
export interface CreditBridge {
  /** El saldo de hoy. @excel Panel!D95 */
  readonly balance: number;
  /**
   * Cuota de la próxima cuota sin marcar, sin el subsidio FRECH (lo que paga el cliente sin abonos
   * extra); null si no queda ninguna. Incluye los seguros, como en la plantilla (H-05). @excel Panel!F95
   */
  readonly minPayment: number | null;
  /** @excel Panel!H95 */
  readonly extraFrom: IsoDate | null;
}

/**
 * Puente hacia la hoja Deudas: con el seguimiento cuota a cuota, el saldo y la cuota del
 * diagnóstico salen de la tabla del crédito (una sola fuente, H-23).
 *
 * @excel Panel!B95:H102
 */
export function creditBridge(schedule: CreditSchedule): CreditBridge {
  const next = schedule.installments.find((row) => row.number === schedule.next?.number);
  return {
    balance: schedule.currentBalance,
    minPayment: next ? next.scheduledPayment - next.frechSubsidy : null,
    extraFrom: schedule.extraFromDate,
  };
}
