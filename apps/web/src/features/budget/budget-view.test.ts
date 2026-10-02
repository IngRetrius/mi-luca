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
  pocket_id: null,
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

  it('marca la partida tipo bolsillo que no tiene bolsillo (H-02)', () => {
    const items = budgetView(
      [
        row({ id: 'p', expense_type: 'bolsillo' }),
        row({ id: 'q', expense_type: 'bolsillo', pocket_id: 'viajes' }),
        row({ id: 'r', expense_type: 'bolsillo', scope: 'referencia_familiar' }),
      ],
      monthly,
      none,
    )[0]!.items;
    expect(items.map((item) => item.withoutPocket)).toEqual([true, false, false]);
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
