import { describe, expect, it } from 'vitest';

import { parseAsset } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parseAsset', () => {
  it('arma un activo líquido en dólares', () => {
    const parsed = parseAsset(
      form({ name: 'Dólares en efectivo', assetType: 'liquido', value: '1.000', currency: 'USD' }),
      { currencies: ['COP', 'USD'] },
    );
    expect(parsed.ok && parsed.record).toEqual({
      name: 'Dólares en efectivo',
      asset_type: 'liquido',
      value: 1000,
      currency: 'USD',
      generates_income: false,
      note: null,
    });
  });

  it('pide el valor y rechaza números de cuenta', () => {
    const parsed = parseAsset(
      form({ name: 'Cuenta 1234 5678 9012', assetType: 'liquido', value: '', currency: 'COP' }),
      { currencies: ['COP'] },
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      name: 'looksLikeAccount',
      value: 'missingAmount',
    });
  });
});
