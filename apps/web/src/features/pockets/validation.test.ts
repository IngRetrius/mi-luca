import { describe, expect, it } from 'vitest';

import { looksLikeAccountNumber } from '@/lib/account-number';

import { parseBank, parsePocket } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const options = { currencies: ['COP', 'USD'], bankIds: ['b-1'] };

describe('parsePocket', () => {
  it('arma el registro con el saldo escrito como en Colombia', () => {
    const parsed = parsePocket(
      form({ name: ' Viajes ', bank: 'b-1', currency: 'COP', balance: '1.500.000' }),
      options,
    );
    expect(parsed.ok && parsed.record).toEqual({
      name: 'Viajes',
      purpose: null,
      when_used: null,
      bank_id: 'b-1',
      currency: 'COP',
      initial_balance: 1_500_000,
    });
  });

  it('sin banco ni saldo también se guarda', () => {
    const parsed = parsePocket(
      form({ name: 'Ropa', bank: '', currency: 'USD', balance: '' }),
      options,
    );
    expect(parsed.ok && parsed.record.bank_id).toBeNull();
    expect(parsed.ok && parsed.record.initial_balance).toBeNull();
  });

  it('rechaza nombre vacío, banco ajeno, moneda sin tasa y saldo mal escrito', () => {
    const parsed = parsePocket(
      form({ name: '', bank: 'b-2', currency: 'EUR', balance: '1,2,3' }),
      options,
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      name: 'missingName',
      bank: 'invalidBank',
      currency: 'invalidCurrency',
      balance: 'invalidAmount',
    });
  });
});

describe('parseBank', () => {
  it('guarda el nombre, el límite de bolsillos y si es remunerado', () => {
    const parsed = parseBank(form({ name: 'Banco A', maxPockets: '10', isRemunerated: 'on' }));
    expect(parsed.ok && parsed.record).toEqual({
      name: 'Banco A',
      max_pockets: 10,
      is_remunerated: true,
      note: null,
    });
  });

  it('no acepta números de cuenta ni límites fuera de 1 a 99', () => {
    const parsed = parseBank(form({ name: 'Banco A 0123 4567 8901', maxPockets: '0' }));
    expect(!parsed.ok && parsed.errors).toEqual({
      name: 'looksLikeAccount',
      maxPockets: 'invalidMaxPockets',
    });
  });
});

describe('looksLikeAccountNumber', () => {
  it('ocho cifras o más seguidas parecen una cuenta; un año o un límite no', () => {
    expect(looksLikeAccountNumber('Cuenta 12345678')).toBe(true);
    expect(looksLikeAccountNumber('4111-1111-1111-1111')).toBe(true);
    expect(looksLikeAccountNumber('Banco A desde 2026, 10 bolsillos')).toBe(false);
  });
});
