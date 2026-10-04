import { describe, expect, it } from 'vitest';

import { ACTION_TEMPLATES, suggestedActions } from '../../src/action-plan';
import { computeBudget } from '../../src/budget';
import { socialSecurityPayments } from '../../src/incomes';
import { monthlyControl, type MonthlyControlEntry } from '../../src/monthly-control';
import { budgetInput, BUDGET_ROWS, fxContext, socialSecurityFlags } from './adapters';
import { cell, goldenCases } from './cases';
import { expectCell } from './expect-cell';

const RATIO_TOLERANCE = 0.000001;
const CONTROL_ROWS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 a 23
const CONTROL_MONTHS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'] as const;
const ACTION_ROWS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 a 19

/** Categoría de cada fila del presupuesto; las automáticas tienen la suya fija en la hoja. */
function budgetCategory(golden: (typeof goldenCases)[number], row: number): string {
  if (row === 6) return 'Deudas';
  if (row === 7) return 'Seguros';
  if (row <= 12) return 'Metas';
  const value = cell(golden, `Presupuesto!B${row}`);
  return typeof value === 'string' ? value : '';
}

function expectRatio(golden: (typeof goldenCases)[number], ref: string, actual: number | null) {
  const expected = cell(golden, ref);
  if (expected === '' || expected === undefined) {
    expect(actual, ref).toBeNull();
    return;
  }
  expect(Math.abs((actual ?? Number.NaN) - Number(expected)), ref).toBeLessThanOrEqual(
    RATIO_TOLERANCE,
  );
}

describe.each(goldenCases)('caso de oro $case: Control mensual', (golden) => {
  const fx = fxContext(golden);
  const budget = computeBudget(
    budgetInput(golden),
    socialSecurityPayments(socialSecurityFlags(golden)),
    fx,
  );
  const categories = CONTROL_ROWS.map((row) => String(cell(golden, `Control mensual!B${row}`)));
  const entries: MonthlyControlEntry[] = CONTROL_ROWS.flatMap((row, index) =>
    CONTROL_MONTHS.flatMap((column, month) => {
      const value = cell(golden, `Control mensual!${column}${row}`);
      return typeof value === 'number'
        ? [
            {
              category: categories[index]!,
              month: month + 1,
              amount: { amount: value, currency: fx.baseCurrency },
            },
          ]
        : [];
    }),
  );
  const result = monthlyControl(
    categories,
    BUDGET_ROWS.map((row, index) => ({
      category: budgetCategory(golden, row),
      monthlyAverage: budget.rows[index]!.monthlyAverage,
    })),
    entries,
    fx,
  );

  it('reproduce cada categoría (C, P, Q, R, S)', () => {
    CONTROL_ROWS.forEach((row, index) => {
      const line = result.rows[index]!;
      expectCell(golden, `Control mensual!C${row}`, line.monthlyBudget);
      expectCell(golden, `Control mensual!P${row}`, line.averageReal);
      expectCell(golden, `Control mensual!Q${row}`, line.difference);
      expectRatio(golden, `Control mensual!R${row}`, line.deviation);
      expectCell(golden, `Control mensual!S${row}`, line.monthsRecorded);
    });
  });

  it('reproduce la fila de total (C24:R24)', () => {
    expectCell(golden, 'Control mensual!C24', result.total.monthlyBudget);
    CONTROL_MONTHS.forEach((column, month) => {
      expectCell(golden, `Control mensual!${column}24`, result.total.months[month] ?? null);
    });
    expectCell(golden, 'Control mensual!P24', result.total.averageReal);
    expectCell(golden, 'Control mensual!Q24', result.total.difference);
    expectRatio(golden, 'Control mensual!R24', result.total.deviation);
  });
});

const officialTemplate = goldenCases.find((item) => item.case === 'c3-plantilla-vacia')!;

describe.each(goldenCases)('caso de oro $case: Plan de acción', (golden) => {
  const suggested = suggestedActions(golden.cutoffDate, null);

  it('las fechas límite precargadas salen de la fecha de corte (F6:F19)', () => {
    expect(suggested).toHaveLength(ACTION_ROWS.length);
    ACTION_ROWS.forEach((row, index) => {
      const expected = golden.expected['Plan de acción']?.[`F${row}`];
      // Solo las filas que conservan la tarea y la fórmula de la plantilla: una fecha escrita a
      // mano o tareas reordenadas (C2, H-20) dejan de serlo.
      const sameTask =
        cell(golden, `Plan de acción!C${row}`) === cell(officialTemplate, `Plan de acción!C${row}`);
      if (expected !== undefined && sameTask) {
        expect(suggested[index]!.dueDate, `F${row}`).toBe(expected);
      }
    });
  });
});

describe('Plan de acción: prioridad y responsable de la plantilla', () => {
  const golden = officialTemplate;
  const PRIORITIES: Record<string, string> = { Alta: 'alta', Media: 'media', Baja: 'baja' };
  const OWNERS: Record<string, string> = {
    Cliente: 'cliente',
    Asesor: 'asesor',
    Contador: 'contador',
    Abogado: 'abogado',
    Aseguradora: 'aseguradora',
    'Administradora de pensiones': 'administradora_pensiones',
  };

  it('las 14 tareas tienen la prioridad y el responsable de D6:E19, pendientes', () => {
    ACTION_ROWS.forEach((row, index) => {
      const template = ACTION_TEMPLATES[index]!;
      expect(template.priority, `D${row}`).toBe(
        PRIORITIES[String(cell(golden, `Plan de acción!D${row}`))],
      );
      expect(template.owner, `E${row}`).toBe(
        OWNERS[String(cell(golden, `Plan de acción!E${row}`))],
      );
      expect(cell(golden, `Plan de acción!G${row}`)).toBe('Pendiente');
    });
  });
});
