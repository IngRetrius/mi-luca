import { describe, expect, it } from 'vitest';

import { monthValues } from '../cashflow';
import { sequentialSavingsPlan } from './sequential-savings-plan';

const flat = (amount: number) => monthValues(() => amount);

describe('sequentialSavingsPlan', () => {
  it('con el fondo completo no aporta nada y reparte todo el sobrante', () => {
    const plan = sequentialSavingsPlan(flat(100), 500, 500, 2027);
    expect(plan.fundGap).toBe(0);
    expect(plan.monthsToComplete).toBe(0);
    expect(plan.completionMonth).toBeNull();
    expect(plan.toFund.total).toBe(0);
    expect(plan.afterFund).toEqual(flat(100));
  });

  it('si no alcanza en el año, repite el sobrante los años siguientes', () => {
    const plan = sequentialSavingsPlan(flat(100), 1_500, 0, 2027);
    expect(plan.toFund.total).toBe(1_200);
    expect(plan.monthsToComplete).toBe(15);
    expect(plan.completionMonth).toBe('2028-03-01');
  });

  it('los meses negativos no sacan dinero del fondo; sin sobrante nunca se completa', () => {
    const surplus = monthValues((month) => (month === 0 ? -300 : 50));
    const plan = sequentialSavingsPlan(surplus, 100, 0, 2027);
    expect(plan.toFund.months.slice(0, 4)).toEqual([0, 50, 50, 0]);
    expect(plan.afterFund[0]).toBe(-300);
    expect(plan.monthsToComplete).toBe(3);
    expect(sequentialSavingsPlan(flat(-10), 100, 0, 2027).monthsToComplete).toBeNull();
  });
});
