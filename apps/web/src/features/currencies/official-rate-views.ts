import type { IsoDate } from '@miluca/domain';
import { formatDate, type Messages } from '@miluca/i18n';

import { amountToText } from '@/lib/amount';

import { officialRates, type OfficialRate, type OfficialSources } from './official-rates';

/** Lo que el formulario muestra de una tasa oficial y lo que llena con "Usar esta tasa". */
export interface OfficialRateView {
  /** "Tasa oficial: 1 USD = 3.218,75 COP" */
  readonly summary: string;
  /** "TRM, Superfinanciera · 9 de octubre de 2026" */
  readonly source: string;
  /** La tasa como se escribe en el campo, con el formato del país. */
  readonly rate: string;
  readonly asOf: IsoDate;
  /** La nota que queda guardada con la tasa. */
  readonly note: string;
}

/** Por código de moneda; una moneda sin tasa oficial no está. */
export type OfficialRateViews = Readonly<Record<string, OfficialRateView>>;

type OfficialText = Messages['currencies']['official'];

function sourceName(rate: OfficialRate, text: OfficialText): string {
  if (rate.derived) return rate.sources.includes('trm') ? text.crossTrmEcb : text.crossEcb;
  return rate.sources.includes('trm') ? text.sources.trm : text.sources.ecb;
}

/**
 * Las tasas oficiales para un cliente, ya escritas en su idioma y con el formato de su país.
 * Espera a las fuentes (`loadOfficialSources`), que se piden en paralelo con el caso. No falla:
 * con datos raros de una fuente, el formulario queda sin sugerencias.
 */
export async function officialRateViews(
  sources: Promise<OfficialSources>,
  {
    base,
    today,
    locale,
    text,
  }: { base: string; today: IsoDate; locale: string; text: OfficialText },
): Promise<OfficialRateViews> {
  try {
    const views: Record<string, OfficialRateView> = {};
    for (const rate of officialRates(base, today, await sources).values()) {
      const source = sourceName(rate, text);
      const date = formatDate(rate.asOf, locale, 'UTC');
      const value = amountToText(rate.rateToBase, locale, 8);
      views[rate.currency] = {
        summary: text.summary
          .replace('{currency}', rate.currency)
          .replace('{rate}', value)
          .replace('{base}', base),
        source: text.dated.replace('{source}', source).replace('{date}', date),
        rate: value,
        asOf: rate.asOf,
        note: text.note.replace('{source}', source).replace('{date}', date),
      };
    }
    return views;
  } catch {
    return {};
  }
}
