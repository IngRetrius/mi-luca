import { describe, expect, it } from 'vitest';

import { compute } from '../../src/compute';
import { keyFigures } from '../../src/key-figures';
import { DIAGNOSIS_HORIZON_MONTHS } from '../../src/debts';
import { edate } from '../../src/excel';
import { caseInput, debtRows } from './adapters';
import { cell, goldenCases, type GoldenCase } from './cases';
import { expectCell } from './expect-cell';

/** Columnas de los 120 meses de la simulación: E a DT. */
const MONTH_COLUMNS = Array.from({ length: DIAGNOSIS_HORIZON_MONTHS }, (_, month) =>
  column(5 + month),
);
const MORE_THAN_HORIZON = 'Más de 120';

function column(index: number): string {
  let name = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** Filas de un lugar del orden de pago (1 a 8): la de "Orden k" y las cuatro siguientes. */
function slotRows(order: number) {
  const first = 33 + 6 * (order - 1);
  return { owed: first + 1, minimum: first + 2, extra: first + 3, balance: first + 4 };
}

function expectRatio(golden: GoldenCase, ref: string, actual: number | null): void {
  const expected = cell(golden, ref);
  if (expected === '' || expected === undefined || expected === null) {
    expect(actual, ref).toBeNull();
    return;
  }
  expect(Math.abs((actual ?? 0) - (expected as number)), ref).toBeLessThanOrEqual(1e-12);
}

/**
 * Meses para pagar como los calcula Excel con punto decimal: los meses con saldo de más de 0,5,
 * más uno; 0 si el abono único la salda. Con coma decimal, `COUNTIF(E37:DT37,">0.5")` no cuenta
 * nada y la plantilla da 1 (H-28), así que el valor esperado sale de los saldos que calculó Excel.
 */
function expectedMonths(golden: GoldenCase, order: number): number | typeof MORE_THAN_HORIZON {
  const excel = cell(golden, `Deudas!E${85 + order}`);
  if (excel === MORE_THAN_HORIZON) return MORE_THAN_HORIZON;
  if (cell(golden, `Deudas!D${85 + order}`) === 0) return 0;
  const { balance } = slotRows(order);
  const months = MONTH_COLUMNS.filter(
    (col) => (cell(golden, `Deudas!${col}${balance}`) as number) > 0.5,
  );
  return months.length + 1;
}

describe.each(goldenCases)('caso de oro $case: plan de pago de deudas', (golden) => {
  const result = compute(caseInput(golden), { mode: 'compatible' });
  const { classification, simulation } = result.debtPlan;
  const rows = debtRows(golden);
  const start = cell(golden, 'Deudas!C11') as string;

  const payoffDate = (months: number | typeof MORE_THAN_HORIZON): string | null =>
    months === MORE_THAN_HORIZON ? null : months === 0 ? start : edate(start, months - 1);

  it('parámetros del plan (C8:C11)', () => {
    expectCell(golden, 'Deudas!C8', simulation.totalPayment - result.debts.minPayment);
    expectCell(golden, 'Deudas!C9', simulation.totalPayment);
    expectCell(golden, 'Deudas!C10', result.pockets.lumpSumToDebt);
    expect(simulation.startMonth).toBe(start);
  });

  it('tasa mensual, orden, meses, fecha de salida e intereses de cada deuda (I:O)', () => {
    rows.forEach((row, index) => {
      const debt = simulation.debts[index]!;
      expectRatio(golden, `Deudas!I${row}`, classification.monthlyRate[index] ?? null);
      expectCell(golden, `Deudas!K${row}`, debt.order);
      expectCell(golden, `Deudas!N${row}`, debt.interestWithPlan);
      const minimumOnly = cell(golden, `Deudas!O${row}`);
      if (minimumOnly === 'No se paga') {
        expect(debt.neverPaidWithMinimum, `Deudas!O${row}`).toBe(true);
      } else {
        expectCell(golden, `Deudas!O${row}`, debt.interestMinimumOnly);
      }
      if (debt.order === null) {
        expect(debt.monthsToPayoff, `Deudas!L${row}`).toBeNull();
        return;
      }
      const months = expectedMonths(golden, debt.order);
      expect(debt.exceedsHorizon, `Deudas!L${row}`).toBe(months === MORE_THAN_HORIZON);
      expect(debt.monthsToPayoff, `Deudas!L${row}`).toBe(
        months === MORE_THAN_HORIZON ? null : months,
      );
      expect(debt.payoffDate, `Deudas!M${row}`).toBe(payoffDate(months));
    });
  });

  it('simulación mes a mes (filas 29 a 80) y resultado por orden (filas 86 a 93)', () => {
    MONTH_COLUMNS.forEach((col, month) => {
      expect(simulation.months[month], `Deudas!${col}29`).toBe(cell(golden, `Deudas!${col}29`));
      expectCell(golden, `Deudas!${col}30`, simulation.totalPayment);
      expectCell(golden, `Deudas!${col}31`, simulation.availableForExtra[month] ?? null);
    });
    for (let order = 1; order <= 8; order++) {
      const slot = simulation.byOrder[order - 1];
      const refs = slotRows(order);
      expectCell(golden, `Deudas!D${refs.balance}`, slot?.initialBalance ?? 0);
      MONTH_COLUMNS.forEach((col, month) => {
        expectCell(golden, `Deudas!${col}${refs.owed}`, slot?.owed[month] ?? 0);
        expectCell(golden, `Deudas!${col}${refs.minimum}`, slot?.minimum[month] ?? 0);
        expectCell(golden, `Deudas!${col}${refs.extra}`, slot?.extra[month] ?? 0);
        expectCell(golden, `Deudas!${col}${refs.balance}`, slot?.balance[month] ?? 0);
      });
      const months = expectedMonths(golden, order);
      expect(slot === undefined ? 0 : slot.monthsToPayoff, `Deudas!E${85 + order}`).toBe(
        months === MORE_THAN_HORIZON ? null : months,
      );
      expectCell(golden, `Deudas!F${85 + order}`, slot?.interest ?? 0);
    }
  });

  it('totales, ahorro en intereses, salida de la deuda cara (N21:O21, H22, C25, C26, Resumen!C19)', () => {
    expectCell(golden, 'Deudas!N21', simulation.interestWithPlan);
    expectCell(golden, 'Deudas!O21', simulation.interestMinimumOnly);
    const savings = cell(golden, 'Deudas!H22');
    if (savings === 'Ver detalle') {
      expect(simulation.interestSavings).toBeNull();
    } else {
      expectCell(golden, 'Deudas!H22', simulation.interestSavings);
    }
    expect(cell(golden, 'Deudas!C26')).toBe(simulation.anyExceedsHorizon ? 'Sí' : 'No');

    // C25 y Resumen!C19 dependen de las fechas de salida, que Excel calcula con H-28.
    const payoff = result.summary.expensiveDebtPayoff;
    const excelPayoff = cell(golden, 'Deudas!C25');
    expect(cell(golden, 'Resumen!C19')).toBe(excelPayoff);
    if (excelPayoff === '' || excelPayoff === undefined) {
      expect(payoff).toBeNull();
      return;
    }
    if (excelPayoff === 'Más de 120 meses') {
      expect(payoff).toEqual({ date: null, exceedsHorizon: true });
      return;
    }
    const expensiveDates = rows.flatMap((row, index) => {
      const order = simulation.debts[index]!.order;
      if (cell(golden, `Deudas!J${row}`) !== 'Sí' || order === null) return [];
      return [payoffDate(expectedMonths(golden, order))!];
    });
    expect(payoff).toEqual({ date: expensiveDates.sort().at(-1), exceedsHorizon: false });
  });

  it('cifra clave: meses para salir de la deuda cara (como C25, en meses)', () => {
    const months = rows.flatMap((row, index) => {
      const order = simulation.debts[index]!.order;
      if (cell(golden, `Deudas!J${row}`) !== 'Sí' || order === null) return [];
      const value = expectedMonths(golden, order);
      return [value === MORE_THAN_HORIZON ? DIAGNOSIS_HORIZON_MONTHS + 1 : value];
    });
    expect(keyFigures(result).expensiveDebtMonths).toBe(
      months.length === 0 ? null : Math.max(...months),
    );
  });
});
