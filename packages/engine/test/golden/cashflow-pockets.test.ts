import { describe, expect, it } from 'vitest';

import type { FlowRow } from '../../src/cashflow';
import { compute } from '../../src/compute';
import { caseInput, POCKET_ROWS, RECEIVABLE_ROWS } from './adapters';
import { cell, goldenCases, type GoldenCase } from './cases';
import { expectCell } from './expect-cell';

/** Meses del flujo, de enero a diciembre, y la columna del total del año. */
const FLOW_COLUMNS = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'] as const;

// Tolerancia de razones (04-motor, 7.1).
const RATIO_TOLERANCE = 0.000001;

function expectFlowRow(golden: GoldenCase, row: number, actual: FlowRow): void {
  FLOW_COLUMNS.forEach((column, month) => {
    expectCell(golden, `Flujo anual!${column}${row}`, actual.months[month] ?? null);
  });
  expectCell(golden, `Flujo anual!Q${row}`, actual.total);
}

function expectRatio(golden: GoldenCase, ref: string, actual: number | null): void {
  const expected = cell(golden, ref);
  if (expected === '' || expected === undefined || expected === null) {
    expect(actual, ref).toBeNull();
    return;
  }
  expect(typeof expected, ref).toBe('number');
  expect(Math.abs((actual ?? 0) - (expected as number)), ref).toBeLessThanOrEqual(RATIO_TOLERANCE);
}

/** Texto o fecha de la celda; vacía es null. */
function expectText(golden: GoldenCase, ref: string, actual: string | null): void {
  const expected = cell(golden, ref);
  expect(actual, ref).toBe(expected === '' || expected === undefined ? null : expected);
}

const YES_NO = (value: boolean) => (value ? 'Sí' : 'No');
const REALITY_STATUS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  revisar_gastos: 'Revisar gastos',
} as const;
const NO_INCOME_METHOD = {
  no_aplica: 'No aplica',
  aporte_igual: 'Aporte igual',
  aporte_proporcional: 'Aporte proporcional',
} as const;
const COVERED = 'Cubierto por el ingreso';

describe.each(goldenCases)('caso de oro $case: flujo, fondo y bolsillos', (golden) => {
  const result = compute(caseInput(golden), { mode: 'compatible' });
  const { flow, noIncome, destination } = result.cashflow;

  it('año del flujo, cobros y deuda cara (Supuestos y Deudas)', () => {
    expectCell(golden, 'Supuestos!C14', result.cashflow.year);
    RECEIVABLE_ROWS.forEach((row, index) => {
      const receivable = result.receivables.rows[index]!;
      expectCell(golden, `Supuestos!F${row}`, receivable.installments);
      expectText(golden, `Supuestos!G${row}`, receivable.lastPaymentDate);
      expectCell(golden, `Supuestos!I${row}`, receivable.pendingAtCutoff);
    });
    expectCell(golden, 'Supuestos!I49', result.receivables.totalPending);
    expectCell(golden, 'Deudas!C22', result.expensiveDebt.balance);
    expect(cell(golden, 'Deudas!C23')).toBe(YES_NO(result.expensiveDebt.exists));
    expectRatio(golden, 'Deudas!C24', result.summary.debtLoad);
  });

  it('entradas, salidas y balance de cada mes (Flujo anual, filas 7 a 19)', () => {
    expectFlowRow(golden, 7, flow.incomeByKind.laboral);
    expectFlowRow(golden, 8, flow.incomeByKind.renta);
    expectFlowRow(golden, 9, flow.incomeByKind.pension);
    expectFlowRow(golden, 10, flow.incomeByKind.otro);
    expectFlowRow(golden, 11, flow.totalIn);
    expectFlowRow(golden, 13, flow.socialSecurity);
    expectFlowRow(golden, 14, flow.direct);
    expectFlowRow(golden, 15, flow.pockets);
    expectFlowRow(golden, 16, flow.debtPayments);
    expectFlowRow(golden, 17, flow.programmedSavings);
    expectFlowRow(golden, 18, flow.totalOut);
    expectFlowRow(golden, 19, flow.balance);
  });

  it('meses sin ingreso (filas 20 a 22 y T20:T27) y alerta de déficit (B36)', () => {
    expectFlowRow(golden, 20, noIncome.use);
    expectFlowRow(golden, 21, noIncome.contribution);
    expectFlowRow(golden, 22, noIncome.surplus);
    expectCell(golden, 'Flujo anual!T20', noIncome.shortfall);
    expectCell(golden, 'Flujo anual!T21', noIncome.positiveSum);
    expectCell(golden, 'Flujo anual!T22', noIncome.positiveMonths);
    expectCell(golden, 'Flujo anual!T23', noIncome.equalContribution);
    expectCell(golden, 'Flujo anual!T24', noIncome.smallestPositive);
    expect(cell(golden, 'Flujo anual!T25')).toBe(NO_INCOME_METHOD[noIncome.method]);
    expectCell(golden, 'Flujo anual!T26', noIncome.coverable);
    expectRatio(golden, 'Flujo anual!T27', noIncome.coverage);
    expect(cell(golden, 'Flujo anual!B36') !== '').toBe(noIncome.deficitAlert);
  });

  it('destino del sobrante y abonos de cobros (filas 24 a 34)', () => {
    expectFlowRow(golden, 24, destination.extraToDebt);
    expectFlowRow(golden, 25, destination.toInvestment);
    expectFlowRow(golden, 26, destination.freeMargin);
    expectFlowRow(golden, 28, destination.receivablesReceived);
    expectFlowRow(golden, 29, destination.receivablesToDebt);
    expectFlowRow(golden, 30, destination.receivablesToInvestment);
    expectFlowRow(golden, 31, destination.receivablesFree);
    expectFlowRow(golden, 33, destination.totalToInvestment);
    expectFlowRow(golden, 34, destination.totalExtraToDebt);
  });

  it('prueba de realidad (Supuestos!C38:C42)', () => {
    const reality = result.realityCheck;
    expectCell(golden, 'Supuestos!C38', reality.actualMonthly);
    expectCell(golden, 'Supuestos!C39', reality.expectedMonthly);
    expectRatio(golden, 'Supuestos!C40', reality.difference);
    expect(cell(golden, 'Supuestos!C41')).toBe(REALITY_STATUS[reality.status]);
    expectRatio(golden, 'Supuestos!C42', reality.pctToInvestment);
  });

  it('fondo de emergencia (Fondo emergencia!C6:E25)', () => {
    const fund = result.emergencyFund;
    expectCell(golden, 'Fondo emergencia!C6', result.budget.expensesWithoutSavings.monthly);
    expectCell(golden, 'Fondo emergencia!C7', result.budget.essential.monthly);
    (['a', 'b', 'c'] as const).forEach((id, index) => {
      const row = 14 + index;
      const scenario = fund.scenarios[id];
      expectCell(golden, `Fondo emergencia!C${row}`, scenario.keptIncome);
      expectCell(golden, `Fondo emergencia!D${row}`, scenario.monthlyShortfall);
      const covered = cell(golden, `Fondo emergencia!E${row}`);
      if (covered === COVERED) expect(scenario.monthsCovered, `E${row}`).toBeNull();
      else expectCell(golden, `Fondo emergencia!E${row}`, scenario.monthsCovered);
    });
    expectCell(golden, 'Fondo emergencia!C17', fund.months);
    expectCell(golden, 'Fondo emergencia!C18', fund.worstCaseGoal);
    expectCell(golden, 'Fondo emergencia!C19', fund.minimumGoal);
    expectCell(golden, 'Fondo emergencia!C20', fund.fullGoal);
    expectCell(golden, 'Fondo emergencia!C21', fund.currentGoal);
    expectCell(golden, 'Fondo emergencia!C22', fund.sixMonthRule);
    expectCell(golden, 'Fondo emergencia!C23', fund.releasedVsSixMonthRule);
    expectCell(golden, 'Fondo emergencia!C24', result.emergencyProgress.assigned);
    expectRatio(golden, 'Fondo emergencia!C25', result.emergencyProgress.vsFullGoal);
  });

  it('bolsillos y reparto del saldo actual (Bolsillos!D6:G18 y C21:C30)', () => {
    const { pockets } = result;
    const expectRow = (row: number, pocket: (typeof pockets)['emergency'] | undefined) => {
      expectCell(golden, `Bolsillos!D${row}`, pocket?.annualGoal ?? 0);
      expectCell(golden, `Bolsillos!E${row}`, pocket?.monthlyContribution ?? 0);
      expectCell(golden, `Bolsillos!G${row}`, pocket?.balance ?? 0);
    };
    expectRow(6, pockets.emergency);
    expectRow(7, pockets.noIncome);
    // Los bolsillos sin nombre no llegan al motor: sus filas valen 0.
    let next = 0;
    POCKET_ROWS.forEach((row) => {
      const named = cell(golden, `Bolsillos!B${row}`) !== '';
      expectRow(row, named ? pockets.general[next++] : undefined);
    });
    expectRow(18, pockets.total);
    expectCell(golden, 'Bolsillos!C21', pockets.liquidAssets);
    expectCell(golden, 'Patrimonio!C33', result.liquidAssets);
    expectCell(golden, 'Bolsillos!C22', pockets.operatingCushion);
    expectCell(golden, 'Bolsillos!C23', pockets.available);
    expectCell(golden, 'Bolsillos!C24', pockets.assigned);
    expectCell(golden, 'Bolsillos!C25', pockets.excess);
    expectCell(golden, 'Bolsillos!C26', pockets.lumpSumToDebt);
    expectCell(golden, 'Bolsillos!C27', pockets.lumpSumToInvestment);
    expectCell(golden, 'Bolsillos!C28', pockets.unallocated);
    expectCell(golden, 'Bolsillos!C29', pockets.withContribution);
    expect(cell(golden, 'Bolsillos!B30') !== '').toBe(pockets.overAllocated);
  });

  it('Resumen: C14 a C18, C20 a C26 y C35', () => {
    const { summary } = result;
    expectCell(golden, 'Resumen!C14', summary.annualSurplus);
    expectRatio(golden, 'Resumen!C16', summary.debtLoad);
    expectCell(golden, 'Resumen!C17', summary.totalDebt);
    expect(cell(golden, 'Resumen!C18')).toBe(YES_NO(summary.hasExpensiveDebt));
    expectRatio(golden, 'Resumen!C20', summary.liquidityMonths);
    expectCell(golden, 'Resumen!C21', summary.emergencyCurrentGoal);
    expectRatio(golden, 'Resumen!C22', summary.emergencyProgress);
    expectCell(golden, 'Resumen!C23', summary.noIncomeShortfall);
    expectCell(golden, 'Resumen!C24', summary.noIncomeMonthlyContribution);
    expectCell(golden, 'Resumen!C25', summary.annualInvestment);
    expectCell(golden, 'Resumen!C26', summary.lumpSumInvestment);
    expect(cell(golden, 'Resumen!C35')).toBe(REALITY_STATUS[summary.realityCheck]);
  });
});
