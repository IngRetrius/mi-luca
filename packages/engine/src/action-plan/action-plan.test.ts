import { describe, expect, it } from 'vitest';

import { addDays } from '../excel';
import { isOverdue, suggestedActions } from './action-plan';

describe('suggestedActions', () => {
  it('sin contexto son las 14 de la plantilla, contadas desde el corte', () => {
    const actions = suggestedActions('2026-09-28', null);
    expect(actions).toHaveLength(14);
    expect(actions[0]).toEqual({
      key: 'create_pockets',
      priority: 'alta',
      owner: 'cliente',
      dueDate: '2026-10-05',
    });
    expect(actions.at(-1)!.dueDate).toBe('2027-09-28');
  });

  it('con contexto quita las que no aplican al cliente (H-20)', () => {
    const keys = (context: Parameters<typeof suggestedActions>[1]) =>
      suggestedActions('2026-09-28', context).map((action) => action.key);
    const none = keys({ hasDebts: false, hasNewInsurance: false, realityCheckConfirmed: true });
    expect(none).toHaveLength(11);
    expect(none).not.toContain('pay_debts_in_order');
    expect(none).not.toContain('quote_insurance');
    expect(none).not.toContain('complete_reality_check');
    expect(
      keys({ hasDebts: true, hasNewInsurance: true, realityCheckConfirmed: false }),
    ).toHaveLength(14);
  });
});

describe('isOverdue', () => {
  it('vencida si la fecha límite pasó y no está hecha', () => {
    expect(isOverdue({ dueDate: '2026-10-01', status: 'pendiente' }, '2026-10-02')).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-01', status: 'en_curso' }, '2026-10-02')).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-01', status: 'hecho' }, '2026-10-02')).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-02', status: 'pendiente' }, '2026-10-02')).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'pendiente' }, '2026-10-02')).toBe(false);
  });
});

describe('addDays', () => {
  it('cruza meses, años y bisiestos', () => {
    expect(addDays('2026-09-28', 365)).toBe('2027-09-28');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
