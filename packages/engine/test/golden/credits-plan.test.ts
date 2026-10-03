import { describe, expect, it } from 'vitest';

import {
  CREDIT_HORIZON_INSTALLMENTS,
  creditSchedule,
  creditsPaymentPlan,
  creditsPanel,
  type TrackedCredit,
} from '../../src/credits';
import { cell, creditCases, excelN } from './cases';
import { creditInput, creditMarks } from './credit-adapters';
import { expectCell } from './expect-cell';

const PLAN = 'Plan de pago';
const FIRST_ROW = 28;
const METHODS = {
  Avalancha: 'avalancha',
  'Bola de nieve': 'bola_de_nieve',
  'Orden manual': 'manual',
} as const;

function column(index: number): string {
  let name = '';
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

describe.each(creditCases)('caso de oro $case: plan de pago de los créditos', (golden) => {
  const sheets = Array.from({ length: 8 }, (_, k) => `Crédito ${k + 1}`);
  const credits: TrackedCredit[] = sheets.map((sheet, k) => {
    const credit = creditInput(golden, sheet);
    const manual = cell(golden, `${PLAN}!J${12 + k}`);
    return {
      currency: 'COP',
      credit,
      schedule: creditSchedule(
        credit,
        creditMarks(golden, sheet, credit.firstInstallmentNumber),
        golden.cutoffDate,
      ),
      manualOrder: typeof manual === 'number' ? manual : null,
    };
  });
  const method = METHODS[String(cell(golden, `${PLAN}!C5`)) as keyof typeof METHODS];
  const plan = creditsPaymentPlan(
    credits,
    method,
    excelN(cell(golden, `${PLAN}!C6`)),
    golden.cutoffDate,
    { baseCurrency: 'COP', ratesToBase: {} },
  );

  it('primer mes y pago total (C7:C8)', () => {
    expect(plan.startMonth).toBe(cell(golden, `${PLAN}!C7`));
    expectCell(golden, `${PLAN}!C8`, plan.totalPayment);
  });

  it('cada crédito: orden, fin solo con cuotas y con el plan, meses antes y costos (K:P)', () => {
    plan.rows.forEach((row, k) => {
      const r = 12 + k;
      expectCell(golden, `${PLAN}!K${r}`, row.order);
      const onlyEnd = cell(golden, `${PLAN}!L${r}`);
      expect(row.minimumOnlyExceedsHorizon ? 'Más de 360' : row.endMinimumOnly, `L${r}`).toBe(
        onlyEnd === '' ? null : onlyEnd,
      );
      const planEnd = cell(golden, `${PLAN}!M${r}`);
      expect(row.withPlanExceedsHorizon ? 'Más de 360' : row.endWithPlan, `M${r}`).toBe(
        planEnd === '' ? null : planEnd,
      );
      expectCell(golden, `${PLAN}!N${r}`, row.monthsEarlier);
      expectCell(golden, `${PLAN}!O${r}`, row.costMinimumOnly);
      expectCell(golden, `${PLAN}!P${r}`, row.costWithPlan);
    });
    expectCell(golden, `${PLAN}!O20`, plan.costMinimumOnly);
    expectCell(golden, `${PLAN}!P20`, plan.costWithPlan);
    expectCell(golden, `${PLAN}!C21`, plan.savings);
  });

  it('simulación de 360 meses con el plan y solo con cuotas (filas 28 a 387)', () => {
    for (let month = 0; month < CREDIT_HORIZON_INSTALLMENTS; month++) {
      const r = FIRST_ROW + month;
      expect(plan.simulation.months[month], `C${r}`).toBe(cell(golden, `${PLAN}!C${r}`));
      expectCell(golden, `${PLAN}!D${r}`, plan.simulation.availableForExtra[month] ?? null);
      for (let order = 1; order <= 8; order++) {
        const slot = plan.simulation.byOrder[order - 1];
        const base = 5 + 4 * (order - 1);
        expectCell(golden, `${PLAN}!${column(base)}${r}`, slot?.owed[month] ?? 0);
        expectCell(golden, `${PLAN}!${column(base + 1)}${r}`, slot?.minimum[month] ?? 0);
        expectCell(golden, `${PLAN}!${column(base + 2)}${r}`, slot?.extra[month] ?? 0);
        expectCell(golden, `${PLAN}!${column(base + 3)}${r}`, slot?.balance[month] ?? 0);
      }
      plan.minimumOnlyBalances.forEach((balances, k) => {
        expectCell(golden, `${PLAN}!${column(37 + k)}${r}`, balances[month] ?? 0);
      });
      expectCell(golden, `${PLAN}!AS${r}`, plan.debtWithPlan[month] ?? 0);
      expectCell(golden, `${PLAN}!AT${r}`, plan.debtMinimumOnly[month] ?? 0);
      expectCell(golden, `${PLAN}!AU${r}`, plan.paymentWithPlan[month] ?? 0);
    }
  });

  describe('Panel', () => {
    const panel = creditsPanel(
      credits,
      plan,
      golden.cutoffDate,
      excelN(cell(golden, 'Datos!F16')),
      { baseCurrency: 'COP', ratesToBase: {} },
    );
    const names = sheets.map((sheet) => cell(golden, `${sheet}!C6`));
    const CALENDAR = { vencida: 'Vencida', esta_semana: 'Paga esta semana', al_dia: 'Al día' };
    const LEVEL = {
      sana: 'Sana (hasta 30%)',
      alta: 'Alta (30% a 40%)',
      muy_alta: 'Muy alta (40% a 50%)',
      critica: 'Crítica (más de 50%)',
    };

    it('cifras de hoy y carga (B5:L5, D7:E7)', () => {
      expectCell(golden, 'Panel!B5', panel.totalDebt);
      expectCell(golden, 'Panel!D5', panel.nextPayments);
      expectCell(golden, 'Panel!F5', panel.pendingInterest);
      expect(Math.abs(panel.principalPaidShare - excelN(cell(golden, 'Panel!H5')))).toBeLessThan(
        1e-6,
      );
      expect(panel.debtFree?.exceedsHorizon ? 'Más de 30 años' : panel.debtFree?.date).toBe(
        cell(golden, 'Panel!J5'),
      );
      expectCell(golden, 'Panel!L5', panel.overdueCount);
      expect(Math.abs((panel.debtLoad ?? 0) - excelN(cell(golden, 'Panel!D7')))).toBeLessThan(1e-6);
      expect(LEVEL[panel.debtLoadLevel!]).toBe(cell(golden, 'Panel!E7'));
    });

    it('calendario del mes y tramos (B25:F32, K25:K28)', () => {
      panel.calendar.forEach((entry, k) => {
        const r = 25 + k;
        expect(names[entry.creditIndex], `B${r}`).toBe(cell(golden, `Panel!B${r}`));
        expect(entry.date, `C${r}`).toBe(cell(golden, `Panel!C${r}`));
        expectCell(golden, `Panel!D${r}`, entry.amount);
        expectCell(golden, `Panel!E${r}`, entry.day);
        expect(CALENDAR[entry.status], `F${r}`).toBe(cell(golden, `Panel!F${r}`));
      });
      expectCell(golden, 'Panel!K25', panel.monthSegments[0]);
      expectCell(golden, 'Panel!K26', panel.monthSegments[1]);
      expectCell(golden, 'Panel!K27', panel.monthSegments[2]);
      expectCell(
        golden,
        'Panel!K28',
        panel.monthSegments.reduce((a, b) => a + b, 0),
      );
    });

    it('abono sugerido del próximo mes (G36:I43)', () => {
      panel.suggestedExtras.forEach((entry, k) => {
        expect(names[entry.creditIndex]).toBe(cell(golden, `Panel!G${36 + k}`));
        expectCell(golden, `Panel!I${36 + k}`, entry.amount);
      });
    });

    it('hitos (B48:G55)', () => {
      panel.milestones.forEach((entry, k) => {
        const r = 48 + k;
        expect(names[entry.creditIndex], `B${r}`).toBe(cell(golden, `Panel!B${r}`));
        expect(entry.endDate, `C${r}`).toBe(cell(golden, `Panel!C${r}`));
        expectCell(golden, `Panel!D${r}`, entry.freedPayment);
        expectCell(golden, `Panel!E${r}`, entry.paymentAfter);
        expectCell(golden, `Panel!F${r}`, entry.yearsFromCutoff);
        expect(Math.abs((entry.loadAfter ?? 0) - excelN(cell(golden, `Panel!G${r}`)))).toBeLessThan(
          1e-6,
        );
      });
      expect(cell(golden, `Panel!B${48 + panel.milestones.length}`)).toBe('');
    });

    it('deuda año por año (B60:F90)', () => {
      panel.byYear.forEach((entry, k) => {
        const r = 60 + k;
        expectCell(golden, `Panel!B${r}`, entry.year);
        expectCell(golden, `Panel!C${r}`, entry.debtWithPlan);
        expectCell(golden, `Panel!D${r}`, entry.debtMinimumOnly);
        expectCell(golden, `Panel!E${r}`, entry.paymentsWithPlan);
        const load = cell(golden, `Panel!F${r}`);
        if (load === '') expect(entry.averageLoad, `F${r}`).toBeNull();
        else expect(Math.abs((entry.averageLoad ?? 0) - excelN(load)), `F${r}`).toBeLessThan(1e-6);
      });
    });
  });
});
