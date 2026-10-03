import { describe, expect, it } from 'vitest';

import { compute, type CaseInput } from '../../src/compute';
import type { DebtInput } from '../../src/debts';
import { qualityChecks } from '../../src/quality';
import { caseInput } from '../golden/adapters';
import { goldenCases } from '../golden/cases';

const golden = (name: string) => goldenCases.find((item) => item.case === name)!;

describe('modo nativo: cuotas en el flujo hasta que el plan salda las deudas (H-03, ADR 0015)', () => {
  it('mientras quede deuda en el plan, las cuotas salen completas todos los meses (C4)', () => {
    const input = caseInput(golden('c4-deudas'));
    const compatible = compute(input, { mode: 'compatible' });
    const native = compute(input, { mode: 'native' });
    expect(native.cashflow.flow.debtPayments.months).toEqual(
      compatible.cashflow.flow.debtPayments.months,
    );
  });

  it('una deuda que el plan salda en el año del flujo deja de salir desde el mes siguiente', () => {
    const base = caseInput(golden('c8-saldos-cobros'));
    const currency = base.fx.baseCurrency;
    const debt: DebtInput = {
      balance: { amount: 1_000_000, currency },
      minPayment: { amount: 100_000, currency },
      annualRate: 0,
      acceptsExtra: true,
      extraFrom: null,
      manualOrder: null,
    };
    const input: CaseInput = { ...base, debts: [debt], flowYear: 2027 };
    const native = compute(input, { mode: 'native' });
    const compatible = compute(input, { mode: 'compatible' });

    // Sin deuda cara no hay extra: diez cuotas desde octubre de 2026, la última en julio de 2027.
    expect(native.debtPlan.simulation.debts[0]!.payoffDate).toBe('2027-07-01');
    expect(native.cashflow.flow.debtPayments.months).toEqual([
      100_000, 100_000, 100_000, 100_000, 100_000, 100_000, 100_000, 0, 0, 0, 0, 0,
    ]);
    expect(compatible.cashflow.flow.debtPayments.total).toBe(1_200_000);
    expect(native.summary.annualSurplus - compatible.summary.annualSurplus).toBeCloseTo(500_000, 2);

    // El gasto del presupuesto no cambia (es un año típico); el control lo tiene en cuenta.
    expect(native.summary.annualExpenses).toBe(compatible.summary.annualExpenses);
    const surplusCheck = qualityChecks(input, native).items.find(
      (entry) => entry.code === 'surplus_balances',
    );
    expect(surplusCheck?.passed).toBe(true);
  });
});

describe('modo nativo: seguros de la cuota de un crédito en seguimiento (H-05)', () => {
  it('se pagan cada mes sin bajar el saldo; en modo compatible amortizan, como en la hoja Deudas', () => {
    const base = caseInput(golden('c3-plantilla-vacia'));
    const currency = base.fx.baseCurrency;
    const input: CaseInput = {
      ...base,
      debts: [
        {
          balance: { amount: 1_200_000, currency },
          minPayment: { amount: 0, currency },
          annualRate: 0,
          acceptsExtra: true,
          extraFrom: null,
          manualOrder: null,
          tracking: {
            credit: {
              balance: 1_200_000,
              firstInstallmentDate: '2026-10-28',
              firstInstallmentNumber: 1,
              totalInstallments: 12,
              annualRate: 0,
              payment: 110_000,
              insurance: 10_000,
              originalAmount: null,
              acceptsExtra: true,
              extraFromInstallment: null,
              frechPoints: null,
              frechUntilInstallment: null,
            },
            marks: [],
          },
        },
      ],
    };
    const compatible = compute(input, { mode: 'compatible' }).debtPlan.simulation.debts[0]!;
    const native = compute(input, { mode: 'native' }).debtPlan.simulation.debts[0]!;
    // Compatible: 1.200.000 / 110.000 = 11 cuotas. Nativo: 100.000 de capital al mes, 12 cuotas.
    expect(compatible.monthsToPayoff).toBe(11);
    expect(native.monthsToPayoff).toBe(12);
    expect(native.interestWithPlan).toBeCloseTo(120_000, 2);
  });
});
