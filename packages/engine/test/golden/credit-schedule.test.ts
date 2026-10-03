import { describe, expect, it } from 'vitest';

import {
  CREDIT_HORIZON_INSTALLMENTS,
  creditBridge,
  creditSchedule,
  paymentToFinishIn,
  simulateFixedExtra,
  type CreditInput,
  type InstallmentMark,
  type InstallmentStatus,
} from '../../src/credits';
import { cell, creditCases, excelN, type GoldenCase } from './cases';
import { expectCell } from './expect-cell';

const FIRST_ROW = 27;
const STATUS: Readonly<Record<InstallmentStatus, string>> = {
  pagada: 'Pagada',
  vencida: 'Vencida',
  proxima: 'Próxima',
  pendiente: 'Pendiente',
};
const STATE = { pagado: 'Pagado', al_dia: 'Al día', vencidas_sin_marcar: 'Vencidas sin marcar' };

function numberOrNull(golden: GoldenCase, ref: string): number | null {
  const value = cell(golden, ref);
  return typeof value === 'number' ? value : null;
}

/** Las celdas de datos de una hoja "Crédito k" como entrada del motor. */
function creditInput(golden: GoldenCase, sheet: string): CreditInput {
  return {
    balance: excelN(cell(golden, `${sheet}!C9`)),
    firstInstallmentDate: String(cell(golden, `${sheet}!C10`)),
    firstInstallmentNumber: excelN(cell(golden, `${sheet}!C11`)),
    totalInstallments: numberOrNull(golden, `${sheet}!C12`),
    annualRate: numberOrNull(golden, `${sheet}!C13`),
    payment: numberOrNull(golden, `${sheet}!C14`),
    insurance: excelN(cell(golden, `${sheet}!C15`)),
    originalAmount: numberOrNull(golden, `${sheet}!C16`),
    acceptsExtra: cell(golden, `${sheet}!C17`) !== 'No',
    extraFromInstallment: numberOrNull(golden, `${sheet}!C18`),
    frechPoints: numberOrNull(golden, `${sheet}!C19`),
    frechUntilInstallment: numberOrNull(golden, `${sheet}!C20`),
  };
}

/** Marcas de las columnas I, J y O de la tabla ("Sí" o "Si" es pagada). */
function marks(golden: GoldenCase, sheet: string, first: number): InstallmentMark[] {
  return Array.from({ length: CREDIT_HORIZON_INSTALLMENTS }, (_, k) => {
    const row = FIRST_ROW + k;
    const paidText = cell(golden, `${sheet}!O${row}`);
    return {
      installmentNumber: first + k,
      paid: paidText === 'Sí' || paidText === 'Si',
      customPayment: numberOrNull(golden, `${sheet}!I${row}`),
      extraPayment: numberOrNull(golden, `${sheet}!J${row}`),
    };
  }).filter((mark) => mark.paid || mark.customPayment !== null || mark.extraPayment !== null);
}

/** Fecha o texto de la celda; vacía es null. */
function expectText(golden: GoldenCase, ref: string, actual: string | null): void {
  const expected = cell(golden, ref);
  expect(actual, ref).toBe(expected === '' || expected === undefined ? null : expected);
}

describe.each(creditCases)('caso de oro $case: hoja de cada crédito', (golden) => {
  const sheets = Array.from({ length: 8 }, (_, k) => `Crédito ${k + 1}`).filter(
    (sheet) => cell(golden, `${sheet}!F6`) === 'Sí',
  );

  it('tiene los ocho créditos activos', () => {
    expect(sheets).toHaveLength(8);
  });

  describe.each(sheets)('%s', (sheet) => {
    const credit = creditInput(golden, sheet);
    const schedule = creditSchedule(
      credit,
      marks(golden, sheet, credit.firstInstallmentNumber),
      golden.cutoffDate,
    );

    it('cálculos del crédito (F7:F11)', () => {
      expect(Math.abs(schedule.monthlyRate - excelN(cell(golden, `${sheet}!F7`)))).toBeLessThan(
        1e-12,
      );
      expect(
        Math.abs(schedule.frechMonthlyRate - excelN(cell(golden, `${sheet}!F8`))),
      ).toBeLessThan(1e-12);
      expectCell(golden, `${sheet}!F9`, schedule.payment);
      expectText(golden, `${sheet}!F11`, schedule.extraFromDate);
    });

    it('tabla de 360 cuotas (B:N y el estado de la columna Q)', () => {
      schedule.installments.forEach((row, k) => {
        const r = FIRST_ROW + k;
        expectCell(golden, `${sheet}!B${r}`, row.number);
        expectText(golden, `${sheet}!C${r}`, row.date);
        expectCell(golden, `${sheet}!D${r}`, row.openingBalance);
        expectCell(golden, `${sheet}!E${r}`, row.interest);
        expectCell(golden, `${sheet}!F${r}`, row.insurance);
        expectCell(golden, `${sheet}!G${r}`, row.frechSubsidy);
        expectCell(golden, `${sheet}!H${r}`, row.scheduledPayment);
        expectCell(golden, `${sheet}!K${r}`, row.totalPayment);
        expectCell(golden, `${sheet}!L${r}`, row.principal);
        expectCell(golden, `${sheet}!M${r}`, row.closingBalance);
        expectCell(golden, `${sheet}!N${r}`, row.clientPays);
        expectText(golden, `${sheet}!Q${r}`, row.status ? STATUS[row.status] : null);
      });
    });

    it('estado actual (I6:I19)', () => {
      expectCell(golden, `${sheet}!I6`, schedule.currentBalance);
      expectCell(golden, `${sheet}!I7`, schedule.paidCount);
      expectCell(golden, `${sheet}!I8`, schedule.next?.number ?? null);
      expectText(golden, `${sheet}!I9`, schedule.next?.date ?? null);
      expectCell(golden, `${sheet}!I10`, schedule.next?.clientPays ?? 0);
      expectCell(golden, `${sheet}!I11`, schedule.remainingCount);
      expectText(
        golden,
        `${sheet}!I12`,
        schedule.exceedsHorizon ? 'Más de 360 cuotas' : schedule.endDate,
      );
      expectCell(golden, `${sheet}!I13`, schedule.pendingInterest);
      expectCell(golden, `${sheet}!I14`, schedule.pendingTotal);
      expect(
        Math.abs(schedule.principalPaidShare - excelN(cell(golden, `${sheet}!I15`))),
      ).toBeLessThan(1e-6);
      const installmentsShare = cell(golden, `${sheet}!I16`);
      if (installmentsShare === '') expect(schedule.installmentsPaidShare).toBeNull();
      else
        expect(
          Math.abs((schedule.installmentsPaidShare ?? 0) - excelN(installmentsShare)),
        ).toBeLessThan(1e-6);
      expectCell(golden, `${sheet}!I17`, schedule.overdueCount);
      expectCell(golden, `${sheet}!I18`, schedule.payment);
      expect(cell(golden, `${sheet}!I19`)).toBe(STATE[schedule.state]);
    });

    it('puente hacia la hoja Deudas (Panel, sección 7)', () => {
      const row = 95 + Number(sheet.replace('Crédito ', '')) - 1;
      const bridge = creditBridge(schedule);
      expectCell(golden, `Panel!D${row}`, bridge.balance);
      expectCell(golden, `Panel!F${row}`, bridge.minPayment);
      expectText(golden, `Panel!H${row}`, bridge.extraFrom);
      expect(cell(golden, `Panel!G${row}`)).toBe(credit.acceptsExtra ? 'Sí' : 'No');
    });

    it('simuladores (F22:G22, F23)', () => {
      const extra = numberOrNull(golden, `${sheet}!C22`);
      const months = numberOrNull(golden, `${sheet}!C23`);
      const fixed = simulateFixedExtra(schedule, credit.insurance, extra ?? 0);
      const expectedMonths = cell(golden, `${sheet}!F22`);
      if (expectedMonths === 'No alcanza' || expectedMonths === '') {
        expect(fixed.months).toBeNull();
      } else {
        expectCell(golden, `${sheet}!F22`, fixed.months);
        expectCell(golden, `${sheet}!G22`, fixed.interest);
      }
      expectCell(
        golden,
        `${sheet}!F23`,
        months === null ? null : paymentToFinishIn(schedule, credit.insurance, months),
      );
    });
  });
});
