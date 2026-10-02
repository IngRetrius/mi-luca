import { describe, it } from 'vitest';

import { debtTotals } from '../../src/debts';
import { computeGoals, tripCost, type GoalInput } from '../../src/goals';
import { computeInsurance } from '../../src/insurance';
import {
  automaticBudgetInput,
  debtsInput,
  fxContext,
  GOAL_ROWS,
  goalsInput,
  INSURANCE_ROWS,
  insuranceInput,
  tripInput,
} from './adapters';
import { goldenCases } from './cases';
import { expectCell } from './expect-cell';

describe.each(goldenCases)('caso de oro $case: Metas', (golden) => {
  const fx = fxContext(golden);
  const goals = goalsInput(golden);
  const named = goals.filter((goal): goal is GoalInput => goal !== null);
  const result = computeGoals(named, golden.cutoffDate, fx);

  it('reproduce la calculadora de viaje (E17, E23 a E27, E30)', () => {
    const trip = tripCost(tripInput(golden), fx);
    expectCell(golden, 'Metas!E17', trip.lodgingTax);
    expectCell(golden, 'Metas!E23', trip.subtotal);
    expectCell(golden, 'Metas!E24', trip.cushion);
    expectCell(golden, 'Metas!E25', trip.totalForeign);
    expectCell(golden, 'Metas!E27', trip.totalForeignInBase);
    expectCell(golden, 'Metas!E30', trip.total);
  });

  it('reproduce valor usado, meses restantes y aporte de cada meta (F, J, K)', () => {
    let next = 0;
    GOAL_ROWS.forEach((row, index) => {
      if (goals[index] === null) {
        expectCell(golden, `Metas!K${row}`, 0);
        return;
      }
      const goal = result.rows[next++]!;
      expectCell(golden, `Metas!F${row}`, goal.usedAmount);
      expectCell(golden, `Metas!J${row}`, goal.monthsRemaining);
      expectCell(golden, `Metas!K${row}`, goal.monthlyContribution);
    });
    expectCell(golden, 'Metas!K11', result.monthlyTotal);
  });
});

describe.each(goldenCases)('caso de oro $case: Seguros y Deudas', (golden) => {
  const fx = fxContext(golden);

  it('reproduce el costo mensual y el total de los seguros nuevos (I6:I15, H16, I16)', () => {
    const result = computeInsurance(insuranceInput(golden), fx);
    INSURANCE_ROWS.forEach((row, index) => {
      expectCell(golden, `Seguros!I${row}`, result.rows[index]!.monthlyCost);
    });
    expectCell(golden, 'Seguros!H16', result.newPremiumsAnnual);
    expectCell(golden, 'Seguros!I16', result.newPremiumsMonthly);
  });

  it('reproduce el saldo total y las cuotas mínimas (D21, F21)', () => {
    const totals = debtTotals(debtsInput(golden), fx);
    expectCell(golden, 'Deudas!D21', totals.balance);
    expectCell(golden, 'Deudas!F21', totals.minPayment);
  });
});

describe.each(goldenCases)('caso de oro $case: filas automáticas del presupuesto', (golden) => {
  it('calcula el valor por pago de las filas 6 a 12 (D6:D12)', () => {
    automaticBudgetInput(golden).forEach((item, index) => {
      expectCell(golden, `Presupuesto!D${6 + index}`, item.amount?.amount ?? null);
    });
  });
});
