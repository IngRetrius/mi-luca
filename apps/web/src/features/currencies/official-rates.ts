import type { IsoDate } from '@miluca/domain';

/**
 * Tasa oficial sugerida al registrar una moneda (ADR 0032). Aquí solo se leen las publicaciones y
 * se calcula la sugerencia, sin red: la consulta está en `official-rate-sources.ts`. La tasa que
 * se guarda la decide quien llena el formulario; esto no convierte importes (eso solo lo hace el
 * motor, con las tasas del cliente).
 */

/** Publicaciones oficiales de las que sale la sugerencia. */
export type OfficialSource = 'trm' | 'ecb';

/** Una TRM de la Superfinanciera [F81]: pesos por dólar y los días en que rige. */
export interface TrmRow {
  readonly copPerUsd: number;
  readonly from: IsoDate;
  readonly to: IsoDate;
}

/** Una tasa de referencia del Banco Central Europeo [F82]: unidades de la moneda por 1 euro. */
export interface EcbRow {
  readonly currency: string;
  readonly perEur: number;
  readonly date: IsoDate;
}

/** Lo que se leyó de cada fuente; vacío si no respondió. */
export interface OfficialSources {
  readonly trm: readonly TrmRow[];
  readonly ecb: readonly EcbRow[];
}

/** La tasa sugerida para una moneda, como en `client_fx_rates`: unidades de la base por 1 unidad. */
export interface OfficialRate {
  readonly currency: string;
  readonly rateToBase: number;
  /** Fecha de la cotización más vieja que se usó. */
  readonly asOf: IsoDate;
  readonly sources: readonly OfficialSource[];
  /** Cruzada de dos o más cotizaciones: no está publicada tal cual. */
  readonly derived: boolean;
}

/** Una cotización más vieja que esto no se sugiere: la fuente dejó de publicarla. */
export const MAX_AGE_DAYS = 7;

const CURRENCY = /^[A-Z]{3}$/;
const DAY_MS = 86_400_000;

/** Los diez primeros caracteres si son una fecha real ("2026-10-10T00:00:00.000" → "2026-10-10"). */
function isoDay(value: unknown): IsoDate | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const day = value.slice(0, 10);
  const time = Date.parse(day);
  // Date.parse acepta el 30 de febrero y lo pasa a marzo: se compara con lo que vuelve.
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(day) ? day : null;
}

function positive(value: unknown): number | null {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

function ageInDays(date: IsoDate, today: IsoDate): number {
  return (Date.parse(today) - Date.parse(date)) / DAY_MS;
}

function isCurrent(date: IsoDate, today: IsoDate): boolean {
  return date <= today && ageInDays(date, today) <= MAX_AGE_DAYS;
}

/** Las filas de la TRM en datos.gov.co: `valor`, `vigenciadesde` y `vigenciahasta`. */
export function parseTrm(json: unknown): TrmRow[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return [];
    const row = item as Record<string, unknown>;
    const copPerUsd = positive(row.valor);
    const from = isoDay(row.vigenciadesde);
    const to = isoDay(row.vigenciahasta);
    return copPerUsd !== null && from !== null && to !== null ? [{ copPerUsd, from, to }] : [];
  });
}

/** El CSV del BCE con `detail=dataonly`: una fila por moneda con su fecha y su valor por euro. */
export function parseEcbCsv(csv: string): EcbRow[] {
  const [header = '', ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const currencyAt = columns.indexOf('CURRENCY');
  const denominatorAt = columns.indexOf('CURRENCY_DENOM');
  const dateAt = columns.indexOf('TIME_PERIOD');
  const valueAt = columns.indexOf('OBS_VALUE');
  if (currencyAt < 0 || dateAt < 0 || valueAt < 0) return [];
  return lines.flatMap((line) => {
    const cells = line.split(',');
    const currency = cells[currencyAt] ?? '';
    const perEur = positive(cells[valueAt]);
    const date = isoDay(cells[dateAt]);
    if (denominatorAt >= 0 && cells[denominatorAt] !== 'EUR') return [];
    return CURRENCY.test(currency) && perEur !== null && date !== null
      ? [{ currency, perEur, date }]
      : [];
  });
}

/** La TRM que rige hoy o, si la fuente aún no publica la de hoy, la última que no esté vieja. */
export function currentTrm(rows: readonly TrmRow[], today: IsoDate): TrmRow | null {
  let best: TrmRow | null = null;
  for (const row of rows) {
    if (isCurrent(row.from, today) && (best === null || row.from > best.from)) best = row;
  }
  return best;
}

/** La última cotización del BCE de cada moneda que no esté vieja. */
function currentEcb(rows: readonly EcbRow[], today: IsoDate): Map<string, EcbRow> {
  const latest = new Map<string, EcbRow>();
  for (const row of rows) {
    const known = latest.get(row.currency);
    if (isCurrent(row.date, today) && (!known || row.date > known.date))
      latest.set(row.currency, row);
  }
  return latest;
}

/** Unidades de cada moneda por 1 euro y las cotizaciones de las que sale. */
interface PerEur {
  readonly value: number;
  readonly dates: readonly IsoDate[];
  readonly sources: readonly OfficialSource[];
}

function perEurQuotes(trm: TrmRow | null, ecb: Map<string, EcbRow>): Map<string, PerEur> {
  const quotes = new Map<string, PerEur>([['EUR', { value: 1, dates: [], sources: [] }]]);
  for (const row of ecb.values()) {
    quotes.set(row.currency, { value: row.perEur, dates: [row.date], sources: ['ecb'] });
  }
  // El BCE no publica el peso colombiano: sale de la TRM y del dólar por euro.
  const usd = ecb.get('USD');
  if (trm && usd) {
    quotes.set('COP', {
      value: trm.copPerUsd * usd.perEur,
      dates: [trm.from, usd.date],
      sources: ['trm', 'ecb'],
    });
  }
  return quotes;
}

/** Seis cifras significativas y hasta 8 decimales, como `client_fx_rates.rate_to_base`. */
export function roundRate(value: number): number {
  return Math.round(Number(value.toPrecision(6)) * 1e8) / 1e8;
}

function officialRate(
  currency: string,
  value: number,
  dates: readonly IsoDate[],
  sources: readonly OfficialSource[],
): OfficialRate | null {
  const rateToBase = roundRate(value);
  const asOf = [...dates].sort()[0];
  if (!(rateToBase > 0) || asOf === undefined) return null;
  return {
    currency,
    rateToBase,
    asOf,
    sources: [...new Set(sources)],
    derived: dates.length > 1,
  };
}

/**
 * La tasa oficial de cada moneda que se puede sugerir a un cliente con esta moneda base, a la
 * fecha `today` (hoy en su país). Con el euro de por medio: base por euro dividido por moneda por
 * euro. El dólar frente al peso es la TRM tal cual, sin pasar por el euro.
 */
export function officialRates(
  base: string,
  today: IsoDate,
  sources: OfficialSources,
): ReadonlyMap<string, OfficialRate> {
  const trm = currentTrm(sources.trm, today);
  const quotes = perEurQuotes(trm, currentEcb(sources.ecb, today));
  const rates = new Map<string, OfficialRate>();
  const baseQuote = quotes.get(base);
  if (baseQuote) {
    for (const [currency, quote] of quotes) {
      if (currency === base) continue;
      const rate = officialRate(
        currency,
        baseQuote.value / quote.value,
        [...baseQuote.dates, ...quote.dates],
        [...baseQuote.sources, ...quote.sources],
      );
      if (rate) rates.set(currency, rate);
    }
  }
  if (trm) {
    const direct =
      base === 'COP'
        ? officialRate('USD', trm.copPerUsd, [trm.from], ['trm'])
        : base === 'USD'
          ? officialRate('COP', 1 / trm.copPerUsd, [trm.from], ['trm'])
          : null;
    if (direct) rates.set(direct.currency, direct);
  }
  return rates;
}
