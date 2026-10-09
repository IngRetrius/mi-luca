import { describe, expect, it } from 'vitest';

import { computeBudget, type BudgetItemInput } from '../budget';
import { computeCostOfLiving } from './compute-cost-of-living';

const fx = { baseCurrency: 'EUR', ratesToBase: { USD: 0.9 } };
const item = (partial: Partial<BudgetItemInput>): BudgetItemInput => ({
  amount: { amount: 100, currency: 'EUR' },
  frequency: 'mensual',
  durationDays: null,
  expenseType: 'directo',
  essential: false,
  payer: 'cliente',
  basicAmount: null,
  isTemporary: false,
  pocket: null,
  ...partial,
});

function costOfLiving(items: BudgetItemInput[], options = {}) {
  return computeCostOfLiving(items, computeBudget(items, 12, fx), fx, options);
}

describe('computeCostOfLiving', () => {
  it('el nivel esencial toma el valor actual aunque el asesor proponga otro básico', () => {
    const result = costOfLiving([
      item({ essential: true, basicAmount: { amount: 60, currency: 'EUR' } }),
    ]);
    expect(result.rows[0]).toEqual({ essential: 1_200, basic: 720, current: 1_200 });
  });

  it('el básico propuesto usa la frecuencia y la moneda de la partida; 0 lo saca del nivel', () => {
    const result = costOfLiving([
      item({ frequency: 'trimestral', basicAmount: { amount: 50, currency: 'USD' } }),
      item({ basicAmount: { amount: 0, currency: 'EUR' } }),
    ]);
    expect(result.rows.map((row) => row.basic)).toEqual([180, 0]);
  });

  it('el ahorro no es costo de vida', () => {
    const result = costOfLiving([item({}), item({ expenseType: 'ahorro', essential: true })]);
    expect(result.levels.current.annual).toBe(1_200);
    expect(result.levels.essential.annual).toBe(0);
  });

  it('separa por pagador y descuenta los temporales en cada nivel', () => {
    const result = costOfLiving([
      item({ payer: 'familia', isTemporary: true, essential: true }),
      item({ payer: 'tercero' }),
      item({}),
    ]);
    expect(result.levels.current.byPayer).toEqual({
      cliente: 1_200,
      familia: 1_200,
      tercero: 1_200,
    });
    expect(result.levels.current.withoutTemporary.monthly).toBe(200);
    expect(result.levels.essential.withoutTemporary.annual).toBe(0);
  });

  it('compara el ingreso propio y cada nivel con los umbrales que aplican; sin umbrales, ninguna comparación', () => {
    const items = [
      item({ essential: true }),
      item({ basicAmount: { amount: 0, currency: 'EUR' } }),
    ];
    const [threshold] = costOfLiving(items, {
      thresholds: [{ code: 'limite', annualLimit: 2_000 }],
      ownIncome: 2_000,
    }).thresholds;
    expect(threshold?.ownIncomeExceeds).toBe(false);
    expect(threshold?.levelExceeds).toEqual({ essential: false, basic: false, current: true });
    expect(costOfLiving(items).thresholds).toEqual([]);
  });

  it('un umbral de patrimonio se compara con el patrimonio bruto (ADR 0027)', () => {
    const [assets] = costOfLiving([item({})], {
      thresholds: [{ code: 'tax.filing_gross_assets', annualLimit: 1_000, basis: 'assets' }],
      grossAssets: 1_500,
    }).thresholds;
    expect(assets?.basis).toBe('assets');
    expect(assets?.grossAssetsExceeds).toBe(true);
    const [none] = costOfLiving([item({})], {
      thresholds: [{ code: 'tax.filing_gross_assets', annualLimit: 1_000, basis: 'assets' }],
    }).thresholds;
    expect(none?.grossAssetsExceeds).toBe(false);
  });
});
