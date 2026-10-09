import { describe, expect, it } from 'vitest';

import { pdfSafe, renderLetterPdf, type LetterPdfInput } from './letter-pdf';

const colors = { text: '#2A2F63', textMuted: '#4B5070', border: '#A7E0DB', surface: '#E3F6F5' };

function input(paragraphs: number): LetterPdfInput {
  return {
    title: 'Carta de tu asesor',
    clientName: 'Cliente de prueba',
    planLabel: 'Plan inicial',
    meta: 'Entregado el 4 de octubre de 2026 · cifras con corte al 28 de septiembre de 2026',
    letter: [
      { title: null, text: 'Hola, Cliente.\nTe comparto tu plan.' },
      {
        title: '1. Cómo estás hoy',
        text: Array.from(
          { length: paragraphs },
          (_, index) =>
            `Párrafo ${index + 1}: tu sobrante al año es de $ 15.190.096 y ahorras el 17,7 %.`,
        ).join('\n\n'),
      },
      {
        title: '4. Tu plan de acción',
        text: '- Crear los bolsillos\n- Automatizar transferencias',
      },
    ],
    notesTitle: 'Notas con este plan',
    notes: [{ title: null, text: 'Registra el gasto real cada mes: 1.000 €.' }],
    figuresTitle: 'Cifras del plan',
    figures: [
      { label: 'Sobrante al año', value: '$ 15.190.096' },
      { label: 'Tasa de ahorro', value: '17,7 %' },
    ],
    footer: 'Cifras en COP de hoy. Ilustrativas, no garantizadas.',
    pageLabel: 'Página {page} de {total}',
    scope: 'Esta plataforma no recomienda productos ni entidades.',
    colors,
  };
}

/** Los bytes del PDF como texto latin1, para buscar sus objetos. */
function latin1(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
}

/** Cuenta las páginas del PDF (los objetos de página no van comprimidos). */
function pages(pdf: Uint8Array): number {
  return (latin1(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length;
}

describe('renderLetterPdf', () => {
  it('genera un PDF de una página para una carta corta', async () => {
    const pdf = await renderLetterPdf(input(2));
    expect(latin1(pdf.subarray(0, 5))).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
  });

  it('una carta larga sigue en otra página', async () => {
    expect(pages(await renderLetterPdf(input(60)))).toBeGreaterThan(1);
  });
});

describe('renderLetterPdf con tablas (ADR 0028)', () => {
  it('pone el resumen, las tablas del plan y el asesor antes de la carta', async () => {
    const pdf = await renderLetterPdf({
      ...input(1),
      advisor: 'Preparado por Asesora de prueba',
      summary: { title: 'Resumen', text: 'Tu presupuesto deja 1.000 al mes.' },
      tables: [
        {
          title: 'Bolsillos: lo que se pasa cada mes',
          columns: ['Bolsillo', 'Al mes', 'Hoy tiene'],
          rows: [
            {
              cells: ['Fondo de emergencia', 'Lo que sobre', '$ 4.000.000'],
              detail: 'Queda completo en marzo de 2027.',
            },
            { cells: ['Viajes', '$ 250.000', '$ 0'] },
          ],
          footer: ['Total al mes', '$ 250.000', ''],
          note: 'Lo práctico es programar estas transferencias el día que llega el ingreso.',
        },
        { title: 'Cómo va el plan', rows: [{ cells: ['Tasa de ahorro', '14 % · Atención'] }] },
      ],
    });
    expect(latin1(pdf.subarray(0, 5))).toBe('%PDF-');
    // Las tablas se suman a la carta, las notas y las cifras: ya no cabe en una página.
    expect(pages(pdf)).toBeGreaterThan(pages(await renderLetterPdf(input(1))));
  });
});

describe('pdfSafe', () => {
  it('cambia los espacios finos y el signo menos que Helvetica no tiene', () => {
    expect(pdfSafe('1\u202F000\u2009€ y \u22125 %')).toBe('1\u00A0000\u00A0€ y -5 %');
  });
});
