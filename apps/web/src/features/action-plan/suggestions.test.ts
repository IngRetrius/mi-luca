import { describe, expect, it } from 'vitest';

import { messages } from '@miluca/i18n';

import { suggestedActionRows } from './suggestions';

// Modo compatible: sin contexto, las 14 tareas de la plantilla (ADR 0018).
const computed = {
  mode: 'compatible',
  input: { cutoffDate: '2026-10-04' },
} as unknown as Parameters<typeof suggestedActionRows>[1];

describe('suggestedActionRows', () => {
  it('arma las filas con la fecha contada desde la fecha de corte', () => {
    const rows = suggestedActionRows('cliente', computed, messages.es.actionPlan.templates);
    expect(rows).toHaveLength(14);
    expect(rows[0]).toEqual({
      client_id: 'cliente',
      suggestion_key: 'create_pockets',
      title: 'Crear los bolsillos y repartir el saldo actual',
      priority: 'alta',
      owner_role: 'cliente',
      due_date: '2026-10-11',
      sort_order: 0,
    });
  });

  it('con `only`, solo esas llaves y con el orden de la lista completa', () => {
    const rows = suggestedActionRows('cliente', computed, messages.es.actionPlan.templates, [
      'review_30_days',
      'annual_review',
    ]);
    expect(rows.map((row) => [row.suggestion_key, row.due_date, row.sort_order])).toEqual([
      ['review_30_days', '2026-11-03', 11],
      ['annual_review', '2027-10-04', 13],
    ]);
  });
});
