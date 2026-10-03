import { describe, expect, it } from 'vitest';

import { creditsPaymentPlan } from './payment-plan';
import { creditSchedule, type CreditInput } from './schedule';

const fx = { baseCurrency: 'COP', ratesToBase: {} };

const credit: CreditInput = {
  balance: 1_200_000,
  firstInstallmentDate: '2026-08-28',
  firstInstallmentNumber: 1,
  totalInstallments: 12,
  annualRate: 0,
  payment: null,
  insurance: 0,
  originalAmount: null,
  acceptsExtra: true,
  extraFromInstallment: null,
  frechPoints: null,
  frechUntilInstallment: null,
};

function tracked(input: CreditInput, paid: number) {
  const marks = Array.from({ length: paid }, (_, k) => ({
    installmentNumber: k + 1,
    paid: true,
    customPayment: null,
    extraPayment: null,
  }));
  return {
    currency: 'COP',
    credit: input,
    schedule: creditSchedule(input, marks, '2026-09-28'),
    manualOrder: null,
  };
}

describe('creditsPaymentPlan', () => {
  it('un crédito ya pagado no suma su cuota al pago total ni entra al orden', () => {
    const plan = creditsPaymentPlan(
      [tracked(credit, 12), tracked({ ...credit, balance: 600_000, totalInstallments: 6 }, 0)],
      'avalancha',
      0,
      '2026-09-28',
      fx,
    );
    expect(plan.totalPayment).toBe(100_000);
    expect(plan.rows[0]!.order).toBeNull();
    expect(plan.rows[1]!.order).toBe(1);
  });

  it('los seguros se pagan cada mes sin bajar el saldo; con el extra se ahorran', () => {
    const insured = { ...credit, annualRate: 0.12, insurance: 10_000, payment: 120_000 };
    const plan = creditsPaymentPlan([tracked(insured, 0)], 'avalancha', 50_000, '2026-09-28', fx);
    const slot = plan.simulation.byOrder[0]!;
    expect(slot.owed[0]).toBeCloseTo(
      1_200_000 * (1 + plan.classification.monthlyRate[0]!) + 10_000,
      6,
    );
    expect(plan.rows[0]!.monthsEarlier).toBeGreaterThan(0);
    expect(plan.savings).toBeGreaterThan(0);
  });
});
