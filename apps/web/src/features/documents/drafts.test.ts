import { describe, expect, it } from 'vitest';

import { unknownMarkers } from '@miluca/exporters/documents';
import { messages, messagesFor } from '@miluca/i18n';

import { letterDrafts } from './drafts';

const drafts = messages.es.documents.defaults.drafts;

describe('borrador sugerido de la carta', () => {
  it('con solo presupuesto: la apertura con el nombre, el resumen de la etapa y lo común', () => {
    const result = letterDrafts(drafts, ['presupuesto'], 'tu', 'Ana');
    expect(result.opening).toBe(
      'Hola, Ana. Te escribo para resumir lo que trabajamos y lo que sigue.',
    );
    expect(result.executive_summary).toContain('{{sobrante_anual}}');
    expect(result.executive_summary).not.toContain('{{deuda_total}}');
    expect(Object.keys(result)).toEqual([
      'opening',
      'executive_summary',
      'today',
      'action_plan',
      'tracking',
      'calendar',
      'closing',
    ]);
  });

  it('con las tres etapas junta sus partes: párrafos en el resumen y viñetas en el plan de acción', () => {
    const result = letterDrafts(drafts, ['presupuesto', 'deudas', 'patrimonio'], 'usted', 'Ana');
    expect(result.executive_summary?.split('\n\n')).toHaveLength(3);
    expect(result.action_plan?.split('\n').every((line) => line.startsWith('- '))).toBe(true);
    expect(result.opening).toContain('Le escribo');
  });

  it('con el año en déficit, el resumen y los indicadores hablan de cerrar la diferencia', () => {
    const result = letterDrafts(drafts, ['presupuesto'], 'tu', 'Ana', true);
    expect(result.executive_summary).toContain('superan tus ingresos');
    expect(result.tracking).toContain('a 0 o más');
    expect(result.tracking).not.toContain('{{tasa_de_ahorro}}');
  });

  it('todos los marcadores existen, en español y en inglés', () => {
    for (const language of ['es', 'en'] as const) {
      for (const deficit of [false, true]) {
        const all = letterDrafts(
          messagesFor(language).documents.defaults.drafts,
          ['presupuesto', 'deudas', 'patrimonio'],
          'tu',
          'Ana',
          deficit,
        );
        for (const text of Object.values(all)) expect(unknownMarkers(text)).toEqual([]);
      }
    }
  });
});
