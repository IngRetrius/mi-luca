import { describe, expect, it } from 'vitest';

import { computeBudget } from '../../src/budget';
import { computeCostOfLiving, type CostLevel } from '../../src/cost-of-living';
import { socialSecurityPayments } from '../../src/incomes';
import { budgetInput, fxContext, socialSecurityFlags } from './adapters';
import { cell, excelN, goldenCases } from './cases';
import { expectCell } from './expect-cell';

/**
 * Hoja "Costo de vida" del caso C2, que no está en la plantilla. Sus filas 6 a 24 leen las
 * partidas 13 a 31 del Presupuesto (`F6 = Presupuesto!H13`). Datos de esa clienta, no del país:
 * el nivel básico lo escribió el asesor (columna E, celdas crema), su familia paga todo
 * (fila 30 = fila 25), la matrícula (fila 20, partida 27) es el gasto temporal (fila 32) y el
 * umbral que le aplica es el de `D35`.
 */
describe('caso de oro c2-espana: Costo de vida', () => {
  const c2 = goldenCases.find((golden) => golden.case === 'c2-espana')!;
  const fx = fxContext(c2);
  const SHEET = 'Costo de vida';
  const ROWS = Array.from({ length: 19 }, (_, i) => i + 6); // 6 a 24
  const budgetRow = (row: number) => row + 7;
  const TUITION_ROW = 27;
  const COLUMNS: Readonly<Record<CostLevel, string>> = { essential: 'D', basic: 'E', current: 'F' };

  const items = budgetInput(c2, {
    payer: (row) => (row >= 13 ? 'familia' : 'cliente'),
    basicAnnual: (row) => {
      const typed = c2.inputs[SHEET]?.[`E${row - 7}`];
      return row >= 13 && row <= 31 && typeof typed === 'number' ? typed : null;
    },
    temporary: (row) => row === TUITION_ROW,
  });
  const budget = computeBudget(items, socialSecurityPayments(socialSecurityFlags(c2)), fx);
  const result = computeCostOfLiving(items, budget, fx, {
    thresholds: [
      { code: 'tax.dependent_income_limit', annualLimit: excelN(cell(c2, `${SHEET}!D35`)) },
    ],
    ownIncome: excelN(cell(c2, 'Ingresos!T6')),
  });

  it('las filas de la hoja son las partidas 13 a 31 del Presupuesto', () => {
    for (const row of ROWS) {
      expect(cell(c2, `${SHEET}!B${row}`)).toBe(cell(c2, `Presupuesto!C${budgetRow(row)}`));
      expectCell(c2, `${SHEET}!F${row}`, budget.rows[budgetRow(row) - 6]!.annual);
    }
  });

  it('reproduce cada partida en los tres niveles (D, E, F)', () => {
    for (const row of ROWS) {
      const levels = result.rows[budgetRow(row) - 6]!;
      for (const [level, column] of Object.entries(COLUMNS) as [CostLevel, string][]) {
        expectCell(c2, `${SHEET}!${column}${row}`, levels[level]);
      }
    }
  });

  it('reproduce totales, costo al mes, lo que paga la familia y el costo sin matrícula (filas 25 a 32)', () => {
    for (const [level, column] of Object.entries(COLUMNS) as [CostLevel, string][]) {
      const totals = result.levels[level];
      expectCell(c2, `${SHEET}!${column}25`, totals.annual);
      expectCell(c2, `${SHEET}!${column}29`, totals.monthly);
      expectCell(c2, `${SHEET}!${column}30`, totals.byPayer.familia);
      expectCell(c2, `${SHEET}!${column}31`, totals.byPayer.familia / 12);
      expectCell(c2, `${SHEET}!${column}32`, totals.withoutTemporary.monthly);
      expect(totals.byPayer.cliente, `${level}: la clienta no paga nada`).toBe(0);
    }
  });

  it('compara su ingreso y cada nivel con el umbral (E36, D37:F37)', () => {
    const [threshold] = result.thresholds;
    expect(cell(c2, `${SHEET}!E36`)).toBe(threshold!.ownIncomeExceeds ? 'Supera' : 'No supera');
    for (const [level, column] of Object.entries(COLUMNS) as [CostLevel, string][]) {
      expect(cell(c2, `${SHEET}!${column}37`), level).toBe(
        threshold!.levelExceeds[level] ? 'Sí' : 'No',
      );
    }
  });

  it('el nivel actual coincide con el gasto del presupuesto (F39, RN-032)', () => {
    expect(cell(c2, `${SHEET}!F39`)).toBe('Correcto');
    expect(
      Math.abs(result.levels.current.annual - budget.expensesWithoutSavings.annual),
    ).toBeLessThan(0.01);
  });
});
