import { describe, expect, it } from 'vitest';

import { controlCategories, monthParam, parseMonthParam, shiftMonth } from './control-view';
import { parseMonthEntries } from './validation';

describe('mes de la URL', () => {
  it('lee "AAAA-MM" y si no es válido usa el mes de hoy', () => {
    expect(parseMonthParam('2026-10', '2027-03-15')).toEqual({ year: 2026, month: 10 });
    expect(parseMonthParam('2026-13', '2027-03-15')).toEqual({ year: 2027, month: 3 });
    expect(parseMonthParam(['2026-10'], '2027-03-15')).toEqual({ year: 2027, month: 3 });
    expect(parseMonthParam(undefined, '2027-03-15')).toEqual({ year: 2027, month: 3 });
  });

  it('se mueve entre años', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });
});

describe('controlCategories', () => {
  const labels = { debts: 'Deudas', insurance: 'Seguros', goals: 'Metas' };

  it('las del presupuesto en su orden, las automáticas con valor y las que solo tienen registro', () => {
    const { categories, budgetItems } = controlCategories({
      automatic: { debts: 300, insurance: 0, goals: [100, 50] },
      items: [
        { category: 'Vivienda', monthlyAverage: 1000 },
        { category: 'Alimentación', monthlyAverage: 0 },
        { category: 'Vivienda', monthlyAverage: 200 },
      ],
      recorded: ['Vivienda', 'Regalos'],
      labels,
    });
    expect(categories).toEqual(['Vivienda', 'Alimentación', 'Deudas', 'Metas', 'Regalos']);
    expect(budgetItems.filter((item) => item.category === 'Metas')).toHaveLength(2);
  });
});

describe('parseMonthEntries', () => {
  const form = (entries: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
  };

  it('con valor se guarda, vacío se borra y 0 es un mes sin gasto', () => {
    const parsed = parseMonthEntries(
      form({
        count: '3',
        'category-0': 'Vivienda',
        'amount-0': '1.200.000',
        'currency-0': 'COP',
        'category-1': 'Alimentación',
        'amount-1': '',
        'currency-1': 'COP',
        'category-2': 'Viajes',
        'amount-2': '0',
        'currency-2': 'USD',
      }),
      { currencies: ['COP', 'USD'] },
    );
    expect(parsed.ok && parsed.records).toEqual([
      { category: 'Vivienda', amount: 1_200_000, currency: 'COP' },
      { category: 'Alimentación', amount: null, currency: 'COP' },
      { category: 'Viajes', amount: 0, currency: 'USD' },
    ]);
  });

  it('marca los importes mal escritos y las monedas sin tasa', () => {
    const parsed = parseMonthEntries(
      form({
        count: '2',
        'category-0': 'Vivienda',
        'amount-0': '-5',
        'category-1': 'Viajes',
        'amount-1': '10',
        'currency-1': 'EUR',
      }),
      { currencies: ['COP'] },
    );
    expect(!parsed.ok && parsed.errors).toEqual({ 0: 'invalidAmount', 1: 'invalidCurrency' });
  });
});
