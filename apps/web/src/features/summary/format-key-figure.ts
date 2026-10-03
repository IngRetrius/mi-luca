import { DIAGNOSIS_HORIZON_MONTHS, KEY_FIGURES, type KeyFigureId } from '@miluca/engine';
// Solo los formateadores: el índice del paquete trae todos los textos al navegador.
import { formatMoney, formatPercent } from '@miluca/i18n/format';

/** Textos de las cifras en meses ("1 mes", "{count} meses", "Más de {count} meses"). */
export interface MonthsText {
  readonly one: string;
  readonly other: string;
  readonly more: string;
}

/**
 * Una cifra clave como se muestra: importe en la moneda base, porcentaje o meses. En meses, un
 * valor mayor que el horizonte del diagnóstico es "más de 120 meses". Vacía es "—".
 */
export function formatKeyFigure(
  id: KeyFigureId,
  value: number | null | undefined,
  options: { readonly locale: string; readonly currency: string; readonly months: MonthsText },
): string {
  if (value === null || value === undefined) return '—';
  const kind = KEY_FIGURES[id];
  if (kind === 'ratio') return formatPercent(value, options.locale);
  if (kind === 'months') {
    if (value > DIAGNOSIS_HORIZON_MONTHS) {
      return options.months.more.replace('{count}', String(DIAGNOSIS_HORIZON_MONTHS));
    }
    return value === 1
      ? options.months.one
      : options.months.other.replace('{count}', String(value));
  }
  return formatMoney(value, options.currency, options.locale);
}
