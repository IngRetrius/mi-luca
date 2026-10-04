import { describe, expect, it } from 'vitest';

import { parseInsurance, parseLifeSettings } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parseInsurance', () => {
  it('un seguro de vida en cotización con su prima anual', () => {
    const parsed = parseInsurance(
      form({ insuranceType: 'vida', status: 'cotizando', premium: '1.800.000', currency: 'COP' }),
      { currencies: ['COP'] },
    );
    expect(parsed.ok && parsed.record).toEqual({
      insurance_type: 'vida',
      custom_name: null,
      status: 'cotizando',
      annual_premium_quoted: 1_800_000,
      currency: 'COP',
      beneficiaries_note: null,
      note: null,
    });
  });

  it('"otro" lleva nombre; sin números de póliza', () => {
    const parsed = parseInsurance(
      form({ insuranceType: 'otro', currency: 'COP', note: 'Póliza 1234 5678 9012' }),
      { currencies: ['COP'] },
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      customName: 'missingName',
      note: 'looksLikeAccount',
    });
  });
});

describe('parseLifeSettings', () => {
  it('vacío es la plantilla; un bolsillo ajeno no se guarda', () => {
    expect(
      parseLifeSettings(form({ supportYears: '', pocketId: 'x' }), { pocketIds: ['p1'] }),
    ).toMatchObject({
      ok: true,
      record: { life_support_years: null, life_annual_to_cover: null, insurance_pocket_id: null },
    });
    expect(
      parseLifeSettings(form({ supportYears: '15', annualToCover: '30.000.000', pocketId: 'p1' }), {
        pocketIds: ['p1'],
      }),
    ).toMatchObject({
      ok: true,
      record: {
        life_support_years: 15,
        life_annual_to_cover: 30_000_000,
        insurance_pocket_id: 'p1',
      },
    });
    expect(parseLifeSettings(form({ supportYears: '80' }), { pocketIds: [] })).toMatchObject({
      ok: false,
      errors: { supportYears: 'invalidYears' },
    });
  });
});
