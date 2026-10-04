import type { MoneyHorizon } from '@miluca/domain';

/** Un tramo de edad con el rango en crecimiento de cada perfil, de 0 a 1. */
export interface GrowthRangeBand {
  /** Edad desde la que aplica. @excel Inversión!B36:B39 */
  readonly fromAge: number;
  /** [mínimo, máximo] de conservador, moderado y tolerante. @excel Inversión!D36:I39 */
  readonly conservative: readonly [number, number];
  readonly moderate: readonly [number, number];
  readonly tolerant: readonly [number, number];
}

/**
 * Tabla de la plantilla (protocolo, P8.7.2), de menor a mayor edad. Es un parámetro de la
 * metodología; el asesor puede usar otra.
 */
export const DEFAULT_GROWTH_RANGES: readonly GrowthRangeBand[] = [
  { fromAge: 0, conservative: [0.4, 0.55], moderate: [0.6, 0.75], tolerant: [0.8, 0.9] },
  { fromAge: 35, conservative: [0.3, 0.45], moderate: [0.5, 0.65], tolerant: [0.7, 0.8] },
  { fromAge: 50, conservative: [0.2, 0.35], moderate: [0.4, 0.55], tolerant: [0.55, 0.7] },
  { fromAge: 60, conservative: [0.1, 0.25], moderate: [0.25, 0.4], tolerant: [0.4, 0.55] },
];

/** Por qué no hay rango o todo va a estabilidad. @excel Inversión!B47 */
export type GrowthAllocationNote = 'short_horizon' | 'stability_first' | 'answer_profile';

export interface GrowthAllocation {
  /** Lugar del tramo de edad en la tabla (0 es el primero); null sin edad. @excel Inversión!C41 */
  readonly band: number | null;
  /** @excel Inversión!C42 */
  readonly rangeMin: number;
  /** @excel Inversión!C43 */
  readonly rangeMax: number;
  /** % en crecimiento (RN-113, RN-114). @excel Inversión!C45, Resumen!C28 */
  readonly growthShare: number;
  /** @excel Inversión!C46 */
  readonly stabilityShare: number;
  readonly note: GrowthAllocationNote | null;
}

export interface GrowthAllocationInput {
  /** Años cumplidos en la fecha de corte; null sin fecha de nacimiento. @excel Supuestos!C13 */
  readonly age: number | null;
  /** Perfil final, 0 a 3; null sin responder. @excel Inversión!D32 */
  readonly finalProfile: number | null;
  readonly horizon: MoneyHorizon | null;
  /** 0 es el mínimo del rango y 1 el máximo; lo elige el asesor. @excel Inversión!C44 */
  readonly rangePosition: number;
  readonly ranges: readonly GrowthRangeBand[];
}

/**
 * Rango orientativo en crecimiento según edad y perfil y el % que se usa dentro de él. El dinero
 * que se necesita en menos de 3 años va todo a estabilidad, y sin perfil (o con "no invertir
 * todavía") no hay crecimiento.
 */
export function growthAllocation(input: GrowthAllocationInput): GrowthAllocation {
  const { age, finalProfile, horizon, ranges } = input;
  let band: number | null = null;
  if (age !== null) {
    // MATCH(edad, desde, 1): el último tramo cuya edad inicial no pasa de la edad.
    for (const [index, range] of ranges.entries()) {
      if (range.fromAge <= age) band = index;
    }
  }
  let rangeMin = 0;
  let rangeMax = 0;
  const row = band === null ? undefined : ranges[band];
  if (row && finalProfile !== null && finalProfile > 0) {
    const pair = [row.conservative, row.moderate, row.tolerant][finalProfile - 1]!;
    [rangeMin, rangeMax] = pair;
  }
  const noGrowth = finalProfile === null || finalProfile === 0 || horizon === 'menos_3';
  const growthShare = noGrowth ? 0 : rangeMin + input.rangePosition * (rangeMax - rangeMin);
  let note: GrowthAllocationNote | null = null;
  if (horizon === 'menos_3') note = 'short_horizon';
  else if (finalProfile === 0) note = 'stability_first';
  else if (finalProfile === null) note = 'answer_profile';
  return { band, rangeMin, rangeMax, growthShare, stabilityShare: 1 - growthShare, note };
}
