import { describe, expect, it } from 'vitest';

import { messages } from '@miluca/i18n';

import { addDays, proposalTasks } from './tasks';

const text = { ...messages.es.proposal, frequencies: messages.es.budget.frequencies };
const money = (amount: number, currency: string) => `${amount} ${currency}`;

describe('proposalTasks', () => {
  it('una tarea por ajuste, con qué hacer y el porqué como nota', () => {
    expect(
      proposalTasks(
        [
          {
            kind: 'ajustar',
            amount: 150000,
            currency: 'COP',
            concept: 'Salidas',
            frequency: 'mensual',
            reason: 'Dos salidas menos y llegas al viaje',
          },
          {
            kind: 'quitar',
            amount: null,
            currency: 'COP',
            concept: 'Suscripción B',
            frequency: 'mensual',
            reason: null,
          },
          {
            kind: 'ajustar',
            amount: 90000,
            currency: 'COP',
            concept: 'Regalos',
            frequency: null,
            reason: null,
          },
        ],
        text,
        money,
        '2026-11-04',
      ),
    ).toEqual([
      {
        title: 'Ajustar Salidas a 150000 COP (mensual)',
        note: 'Dos salidas menos y llegas al viaje',
        due_date: '2026-11-04',
        sort_order: 0,
      },
      { title: 'Dejar de pagar Suscripción B', note: '', due_date: '2026-11-04', sort_order: 1 },
      { title: 'Ajustar Regalos a 90000 COP', note: '', due_date: '2026-11-04', sort_order: 2 },
    ]);
  });
});

describe('addDays', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-10-05', 30)).toBe('2026-11-04');
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14');
  });
});
