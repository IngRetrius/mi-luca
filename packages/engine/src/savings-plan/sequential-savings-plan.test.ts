import { describe, expect, it } from 'vitest';

import { monthValues } from '../cashflow';
import { sequentialSavingsPlan } from './sequential-savings-plan';

const flat = (amount: number) => monthValues(() => amount);
// Con corte en diciembre, el plan empieza en enero del año del flujo.
const DECEMBER = '2026-12-15';

describe('sequentialSavingsPlan', () => {
  it('con el fondo completo no aporta nada y reparte todo el sobrante', () => {
    const plan = sequentialSavingsPlan(flat(100), 500, 500, 2027, DECEMBER);
    expect(plan.fundGap).toBe(0);
    expect(plan.monthsToComplete).toBe(0);
    expect(plan.completionMonth).toBeNull();
    expect(plan.toFund.total).toBe(0);
    expect(plan.afterFund).toEqual(flat(100));
  });

  it('si no alcanza en el año, repite el sobrante los años siguientes', () => {
    const plan = sequentialSavingsPlan(flat(100), 1_500, 0, 2027, DECEMBER);
    expect(plan.toFund.total).toBe(1_200);
    expect(plan.monthsToComplete).toBe(15);
    expect(plan.completionMonth).toBe('2028-03-01');
  });

  it('los meses negativos no sacan dinero del fondo; sin sobrante nunca se completa', () => {
    const surplus = monthValues((month) => (month === 0 ? -300 : 50));
    const plan = sequentialSavingsPlan(surplus, 100, 0, 2027, DECEMBER);
    expect(plan.toFund.months.slice(0, 4)).toEqual([0, 50, 50, 0]);
    expect(plan.afterFund[0]).toBe(-300);
    expect(plan.monthsToComplete).toBe(3);
    expect(sequentialSavingsPlan(flat(-10), 100, 0, 2027, DECEMBER).monthsToComplete).toBeNull();
  });

  it('empieza el mes siguiente al corte: lo ahorrado antes del año del flujo ya no se reparte en él', () => {
    // Corte en septiembre: octubre, noviembre y diciembre llenan 300 de los 500 que faltan.
    const plan = sequentialSavingsPlan(flat(100), 500, 0, 2027, '2026-09-28');
    expect(plan.startMonth).toBe('2026-10-01');
    expect(plan.monthsToComplete).toBe(5);
    expect(plan.completionMonth).toBe('2027-02-01');
    expect(plan.toFund.months.slice(0, 3)).toEqual([100, 100, 0]);
    expect(plan.toFund.total).toBe(200);
  });

  it('cada mes usa el sobrante de ese mes del año típico', () => {
    const surplus = monthValues((month) => (month === 9 ? 1_000 : 0)); // solo octubre
    const plan = sequentialSavingsPlan(surplus, 1_500, 0, 2027, '2026-09-28');
    // Octubre de 2026 aporta 1.000; octubre de 2027 completa los 500 que faltan.
    expect(plan.completionMonth).toBe('2027-10-01');
    expect(plan.toFund.months[9]).toBe(500);
  });
});
