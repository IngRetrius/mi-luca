import { describe, expect, it } from 'vitest';

import { amountText, percentText, present } from './fields';
import { caseSnapshot, type SnapshotRows } from './snapshot';

const rows = {
  client: {
    base_currency: 'COP',
    country_code: 'CO',
    client_type: 'contratista',
    birth_date: '1980-02-01',
    sex: 'mujer',
    dependents_count: 1,
  },
  settings: null,
  fxRates: [{ currency: 'USD', rate_to_base: 3900, as_of: '2026-10-01' }],
  incomes: [
    {
      id: 'i1',
      name: 'Honorarios',
      kind: 'laboral',
      currency: 'COP',
      amount: 6_000_000,
      payments_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      is_net: false,
    },
  ],
  budgetItems: [
    {
      id: 'b1',
      category: 'Vivienda',
      concept: 'Arriendo',
      currency: 'COP',
      amount: 1_200_000,
      frequency: 'mensual',
      duration_days: null,
      expense_type: 'directo',
      essential: true,
      payer: 'cliente',
      pocket_id: null,
      scope: 'presupuesto',
    },
  ],
  banks: [],
  pockets: [
    { id: 'p1', kind: 'general', name: 'Seguros', purpose: null },
    { id: 'p2', kind: 'emergencia', name: 'Fondo', purpose: null },
  ],
  debts: [],
  goals: [],
  insurances: [],
  assets: [],
  investments: [],
  receivables: [],
  riskProfile: null,
  realityCheck: null,
} as unknown as SnapshotRows;

describe('caseSnapshot', () => {
  const text = caseSnapshot(rows, '2026-10-04');

  it('trae los registros con su id para corregir en vez de duplicar', () => {
    expect(text).toContain(
      'id i1 | Honorarios | laboral | 6000000 COP | pagos por mes 1,1,1,1,1,1,1,1,1,1,1,0',
    );
    expect(text).toContain(
      'id b1 | Vivienda / Arriendo | 1200000 COP | mensual | directo | esencial',
    );
    expect(text).toContain('USD | 3900');
  });

  it('solo los bolsillos generales y nada para identificar al cliente', () => {
    expect(text).toContain('id p1 | Seguros');
    expect(text).not.toContain('id p2');
    expect(text).not.toMatch(/display_name|correo|@/);
    expect(text).toContain('Deudas: ninguno');
  });
});

describe('valores para los formularios', () => {
  it('importes con coma decimal y sin miles; porcentajes desde razones', () => {
    expect(amountText(1_750_905.5)).toBe('1750905,5');
    expect(amountText(1200000)).toBe('1200000');
    expect(amountText(-1)).toBe('inválido');
    expect(amountText(null)).toBe('');
    expect(percentText(0.285)).toBe('28,5');
  });

  it('solo lo que vino: lo demás queda como estaba', () => {
    expect(
      present([
        ['a', '1'],
        ['b', undefined],
      ]),
    ).toEqual({ a: '1' });
  });
});
