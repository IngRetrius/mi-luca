/**
 * Tasa de usura de referencia (protocolo 8.3, paso 1; ADR 0028). La publica la Superintendencia
 * Financiera cada mes; la app guarda la más reciente en `country_parameters` (`debt.usury_rate`) y la
 * muestra con su mes. Solo marca deudas mientras está vigente.
 */
export interface UsuryRate {
  /** Tasa efectiva anual (0,2859 es 28,59 %). */
  readonly rate: number;
  /** Primer día de la vigencia. */
  readonly validFrom: string;
  /** Día siguiente al último de la vigencia; null si no tiene fin. */
  readonly validTo: string | null;
  readonly source: string;
}

/**
 * Margen bajo la usura desde el que una deuda se marca "cerca de la tasa de usura". **Supuesto**
 * (G15): 3 puntos, cerca de lo que la tasa se mueve en un trimestre.
 */
export const USURY_NEAR_MARGIN = 0.03;

export type UsuryStatus = 'above' | 'near' | null;

/** ¿La tasa está vigente en `today` (fecha ISO)? */
export function usuryIsCurrent(usury: UsuryRate, today: string): boolean {
  return usury.validFrom <= today && (usury.validTo === null || today < usury.validTo);
}

/** Dónde queda la tasa de una deuda frente a la usura vigente: por encima, cerca o nada. */
export function usuryStatus(annualRate: number | null, usury: UsuryRate | null): UsuryStatus {
  if (annualRate === null || usury === null) return null;
  if (annualRate > usury.rate + 1e-9) return 'above';
  if (annualRate >= usury.rate - USURY_NEAR_MARGIN) return 'near';
  return null;
}
