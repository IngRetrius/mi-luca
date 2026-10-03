import { describe, expect, it } from 'vitest';

import type { CreditInput } from '../../src/credits';
import { compute } from '../../src/compute';
import { caseInput } from '../golden/adapters';
import { goldenCases } from '../golden/cases';

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
  extraFromInstallment: 4,
  frechPoints: null,
  frechUntilInstallment: null,
};

describe('compute con seguimiento cuota a cuota', () => {
  it('el diagnóstico usa el saldo de hoy y la próxima cuota de la tabla', () => {
    const input = caseInput(goldenCases.find((golden) => golden.case === 'c3-plantilla-vacia')!);
    const result = compute(
      {
        ...input,
        debts: [
          {
            balance: { amount: 1_200_000, currency: 'COP' },
            minPayment: { amount: 0, currency: 'COP' },
            annualRate: 0,
            acceptsExtra: true,
            extraFrom: null,
            manualOrder: null,
            tracking: {
              credit,
              marks: [
                { installmentNumber: 1, paid: true, customPayment: null, extraPayment: null },
                { installmentNumber: 2, paid: true, customPayment: null, extraPayment: null },
              ],
            },
          },
        ],
      },
      { mode: 'compatible' },
    );
    expect(result.summary.totalDebt).toBe(1_000_000);
    expect(result.debts.minPayment).toBe(100_000);
    expect(result.debtPlan.debts[0]!.extraFrom).toBe('2026-11-28');
    expect(result.creditSchedules[0]?.paidCount).toBe(2);
  });
});
