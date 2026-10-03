import { describe, expect, it } from 'vitest';

import {
  creditSchedule,
  paymentToFinishIn,
  simulateFixedExtra,
  type CreditInput,
} from './schedule';

const credit: CreditInput = {
  balance: 1_200_000,
  firstInstallmentDate: '2026-09-28',
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

describe('creditSchedule', () => {
  it('sin cuota escrita, la calcula con el plazo; con tasa 0 es saldo / cuotas', () => {
    const schedule = creditSchedule(credit, [], '2026-09-28');
    expect(schedule.payment).toBe(100_000);
    expect(schedule.remainingCount).toBe(12);
    expect(schedule.endDate).toBe('2027-08-28');
    expect(schedule.state).toBe('al_dia');
  });

  it('una cuota con fecha igual a la de corte no está vencida: es la próxima', () => {
    const schedule = creditSchedule(credit, [], '2026-09-28');
    expect(schedule.installments[0]!.status).toBe('proxima');
    expect(schedule.overdueCount).toBe(0);
    const later = creditSchedule(credit, [], '2026-09-29');
    expect(later.installments[0]!.status).toBe('vencida');
    expect(later.state).toBe('vencidas_sin_marcar');
  });

  it('el saldo actual descuenta solo el capital de las cuotas marcadas como pagadas', () => {
    const schedule = creditSchedule(
      credit,
      [
        { installmentNumber: 1, paid: true, customPayment: null, extraPayment: 200_000 },
        { installmentNumber: 3, paid: false, customPayment: null, extraPayment: 500_000 },
      ],
      '2026-09-28',
    );
    expect(schedule.currentBalance).toBe(900_000);
    expect(schedule.paidCount).toBe(1);
    expect(schedule.next?.number).toBe(2);
    // El abono de la cuota 3 adelanta el fin aunque no esté marcado.
    expect(schedule.endDate! < '2027-08-28').toBe(true);
  });

  it('el FRECH resta de lo que paga el cliente hasta su cuota, no del saldo', () => {
    const frech = creditSchedule(
      { ...credit, annualRate: 0.12, frechPoints: 0.04, frechUntilInstallment: 2 },
      [],
      '2026-09-28',
    );
    const [first, second, third] = frech.installments;
    expect(first!.frechSubsidy).toBeGreaterThan(0);
    expect(first!.clientPays).toBeCloseTo(first!.totalPayment - first!.frechSubsidy, 6);
    expect(second!.frechSubsidy).toBeGreaterThan(0);
    expect(third!.frechSubsidy).toBe(0);
    const plain = creditSchedule({ ...credit, annualRate: 0.12 }, [], '2026-09-28');
    expect(frech.installments[1]!.closingBalance).toBeCloseTo(
      plain.installments[1]!.closingBalance,
      6,
    );
  });

  it('una cuota que no cubre el interés no termina: más de 360 cuotas', () => {
    const schedule = creditSchedule(
      { ...credit, annualRate: 0.3, payment: 10_000, totalInstallments: null },
      [],
      '2026-09-28',
    );
    expect(schedule.exceedsHorizon).toBe(true);
    expect(schedule.endDate).toBeNull();
    expect(schedule.installmentsPaidShare).toBeNull();
  });
});

describe('simuladores', () => {
  const schedule = creditSchedule({ ...credit, annualRate: 0.12 }, [], '2026-09-28');

  it('con un extra fijo termina antes; sin pago, null', () => {
    const base = simulateFixedExtra(schedule, 0, 0);
    const faster = simulateFixedExtra(schedule, 0, 50_000);
    expect(faster.months!).toBeLessThan(base.months!);
    expect(simulateFixedExtra(schedule, 0, -schedule.payment)).toEqual({
      months: null,
      interest: null,
    });
  });

  it('la cuota para terminar en N meses incluye los seguros', () => {
    expect(paymentToFinishIn(schedule, 5_000, 6)! - paymentToFinishIn(schedule, 0, 6)!).toBeCloseTo(
      5_000,
      6,
    );
    expect(paymentToFinishIn(schedule, 0, 0)).toBeNull();
  });
});
