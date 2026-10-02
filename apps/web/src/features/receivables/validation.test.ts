import { describe, expect, it } from 'vitest';

import { parseReceivable } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const valid = {
  debtor: 'Hermana',
  balance: '3.000.000',
  payment: '250.000',
  currency: 'COP',
  firstPayment: '2026-06-01',
  pctToInvestment: '60',
};

describe('parseReceivable', () => {
  it('el asesor fija el % a inversión; vacío es el 100 %', () => {
    const parsed = parseReceivable(form(valid), { currencies: ['COP'], advisor: true });
    expect(parsed.ok && parsed.record).toEqual({
      debtor_label: 'Hermana',
      currency: 'COP',
      balance: 3_000_000,
      monthly_payment: 250_000,
      first_payment_date: '2026-06-01',
      pct_to_investment: 0.6,
      note: null,
    });
    const empty = parseReceivable(form({ ...valid, pctToInvestment: '' }), {
      currencies: ['COP'],
      advisor: true,
    });
    expect(empty.ok && empty.record.pct_to_investment).toBe(1);
  });

  it('del cliente no se lee el % a inversión', () => {
    const parsed = parseReceivable(form(valid), { currencies: ['COP'], advisor: false });
    expect(parsed.ok && 'pct_to_investment' in parsed.record).toBe(false);
  });

  it('saldo y cuota son obligatorios y mayores que 0; la fecha, válida', () => {
    const parsed = parseReceivable(
      form({ ...valid, balance: '', payment: '0', firstPayment: '2026-02-30' }),
      { currencies: ['COP'], advisor: true },
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      balance: 'missingAmount',
      payment: 'invalidAmount',
      firstPayment: 'invalidDate',
    });
  });
});
