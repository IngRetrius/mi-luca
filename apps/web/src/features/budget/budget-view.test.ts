import { describe, expect, it } from 'vitest';

import { budgetView, parseBudgetFilters, type BudgetRowData } from './budget-view';

const row = (overrides: Partial<BudgetRowData>): BudgetRowData => ({
  id: 'x',
  category: 'Alimentación',
  concept: 'Mercado',
  currency: 'COP',
  amount: 100,
  frequency: 'mensual',
  expense_type: 'directo',
  essential: true,
  payer: 'cliente',
  scope: 'presupuesto',
  is_temporary: false,
  ...overrides,
});

const rows = [
  row({ id: 'a' }),
  row({ id: 'b', concept: 'Restaurantes', essential: false, payer: 'familia' }),
  row({ id: 'c', category: 'Vivienda', concept: 'Casa familiar', scope: 'referencia_familiar' }),
  row({ id: 'd', category: 'Vivienda', concept: 'Arriendo', frequency: null }),
];
const monthly = new Map([
  ['a', 100],
  ['b', 50],
  ['d', 0],
]);
const none = { type: null, payer: null, essential: false };

describe('budgetView', () => {
  it('agrupa por categoría con el total mensual de lo que suma', () => {
    const groups = budgetView(rows, monthly, none);
    expect(groups.map((group) => [group.category, group.monthly])).toEqual([
      ['Alimentación', 150],
      ['Vivienda', 0],
    ]);
  });

  it('marca la referencia familiar (no suma) y la partida incompleta', () => {
    const vivienda = budgetView(rows, monthly, none)[1]!;
    expect(vivienda.items[0]).toMatchObject({
      familyReference: true,
      monthly: null,
      incomplete: false,
    });
    expect(vivienda.items[1]).toMatchObject({ incomplete: true });
  });

  it('filtra por pagador y por esencial', () => {
    expect(
      budgetView(rows, monthly, { ...none, payer: 'familia' })[0]?.items.map((item) => item.id),
    ).toEqual(['b']);
    const essential = budgetView(rows, monthly, { ...none, essential: true });
    expect(essential.flatMap((group) => group.items.map((item) => item.id))).toEqual([
      'a',
      'c',
      'd',
    ]);
  });
});

describe('parseBudgetFilters', () => {
  it('lee los filtros de la URL e ignora lo que no es del catálogo', () => {
    expect(parseBudgetFilters({ tipo: 'bolsillo', pagador: 'familia', esencial: '1' })).toEqual({
      type: 'bolsillo',
      payer: 'familia',
      essential: true,
    });
    expect(parseBudgetFilters({ tipo: 'otro', pagador: ['x'] })).toEqual(none);
  });
});
