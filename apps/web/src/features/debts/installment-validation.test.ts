import { describe, expect, it } from 'vitest';

import { isEmptyMark, parseInstallment } from './installment-validation';

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('parseInstallment', () => {
  it('pagada con su fecha real, cuota distinta y abono extra', () => {
    expect(
      parseInstallment(
        form({
          paid: 'si',
          paidOn: '2026-09-14',
          customPayment: '1.400.000',
          extraPayment: '500.000',
        }),
      ),
    ).toMatchObject({
      ok: true,
      record: {
        paid: true,
        paid_on: '2026-09-14',
        custom_payment: 1_400_000,
        extra_payment: 500_000,
      },
    });
  });

  it('la fecha de pago va con la cuota pagada; los importes son mayores que 0', () => {
    expect(
      parseInstallment(form({ paid: 'no', paidOn: '2026-09-14', extraPayment: '0' })),
    ).toMatchObject({
      ok: false,
      errors: { paidOn: 'paidOnWithoutPaid', extraPayment: 'invalidAmount' },
    });
  });

  it('sin nada que guardar, la marca queda vacía', () => {
    const result = parseInstallment(form({ paid: 'no' }));
    expect(result.ok && isEmptyMark(result.record)).toBe(true);
  });
});
