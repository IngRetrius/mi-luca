import type { QcItem } from '@miluca/engine';
import { messages } from '@miluca/i18n';
import { describe, expect, it } from 'vitest';

import { qcMessage } from './qc-text';

const format = {
  money: (amount: number) => `${amount} €`,
  percent: (ratio: number) => `${Math.round(ratio * 100)} %`,
};

function reality(detail: QcItem['detail']): QcItem {
  return { code: 'reality_check_confirms', severity: 'note', passed: false, detail };
}

describe('qcMessage de la prueba de realidad', () => {
  const text = messages.es.quality.checks;

  it('con ahorro esperado, la diferencia va en porcentaje', () => {
    const item = reality({ difference: -0.3, expectedMonthly: 1000, gapMonthly: -300 });
    expect(qcMessage(item, text, format)).toContain('(-30 % frente a lo esperado)');
  });

  it('con un plan sin ahorro esperado, va en dinero al mes (G10)', () => {
    const item = reality({ difference: -9.69, expectedMonthly: -100, gapMonthly: -969 });
    expect(qcMessage(item, text, format)).toContain('(-969 € frente a lo esperado)');
  });

  it('sin el esperado en el detalle, como antes: en porcentaje', () => {
    expect(qcMessage(reality({ difference: -0.3 }), text, format)).toContain('-30 %');
  });
});
