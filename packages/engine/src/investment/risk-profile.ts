import type { DropReaction, InvestingExperience, MoneyHorizon, RiskLevel } from '@miluca/domain';

/** Niveles de riesgo en el orden de la plantilla: el número es su lugar (0 a 3). */
export const RISK_LEVELS: readonly RiskLevel[] = [
  'no_invertir',
  'conservador',
  'moderado',
  'tolerante',
];

/** @excel Listas!N2:O4 */
const DROP_POINTS: Readonly<Record<DropReaction, number>> = {
  venderia: 1,
  esperaria: 2,
  invertiria_mas: 3,
};

/** @excel Listas!P2:Q4 */
const EXPERIENCE_POINTS: Readonly<Record<InvestingExperience, number>> = {
  ninguna: 1,
  algo: 2,
  bastante: 3,
};

/** Respuestas del cliente sobre lo que quiere asumir; null si aún no responde. */
export interface RiskAnswers {
  /** @excel Inversión!C18 */
  readonly dropReaction: DropReaction | null;
  /** @excel Inversión!C19 */
  readonly experience: InvestingExperience | null;
  /** No suma puntos: con menos de 3 años todo va a estabilidad (RN-113). @excel Inversión!C21 */
  readonly horizon: MoneyHorizon | null;
}

/** Condiciones que bajan la capacidad, con el valor que fijó el asesor si lo cambió. */
export interface RiskCapacityInput {
  /** @excel Inversión!C25 (sugerida por tipo de cliente, H-16) */
  readonly variableIncome: boolean;
  /** @excel Inversión!C26 */
  readonly dependentsWithoutLifeInsurance: boolean;
  /**
   * Siempre false: la pensión no se analiza en la plataforma (ADR 0016); se conserva para
   * reproducir la plantilla. @excel Inversión!C27 (hoja Pensión)
   */
  readonly pensionGap: boolean;
  /** @excel Inversión!C28 */
  readonly emergencyFundIncomplete: boolean;
  /** Menos de 5 años para el retiro; ninguna pensión cuenta como asegurada. @excel Inversión!C29 */
  readonly nearRetirementWithoutPension: boolean;
}

export interface RiskProfile {
  /** Puntos de cada respuesta; null sin responder. @excel Inversión!D18, D19 */
  readonly dropPoints: number | null;
  readonly experiencePoints: number | null;
  /** Lo que quiere asumir: 1 a 3, null si falta una respuesta. @excel Inversión!D20 */
  readonly willingness: number | null;
  readonly conditions: RiskCapacityInput;
  /** @excel Inversión!C30 */
  readonly conditionsMet: number;
  /** Lo que puede asumir: 0 a 3; 0 con deuda cara o con 4 condiciones o más. @excel Inversión!D31 */
  readonly capacity: number;
  /** El menor entre disposición y capacidad; null sin disposición (RN-112). @excel Inversión!D32 */
  readonly final: number | null;
  /** @excel Inversión!E20 */
  readonly willingnessLevel: RiskLevel | null;
  /** @excel Inversión!E31 */
  readonly capacityLevel: RiskLevel;
  /** @excel Inversión!E32, Resumen!C27 */
  readonly finalLevel: RiskLevel | null;
}

/**
 * Perfil de riesgo (RN-112): disposición por puntos (3 o menos, conservador; 4 o 5, moderado; 6,
 * tolerante), capacidad por las condiciones que se cumplen (3 menos las condiciones, mínimo 1) y
 * perfil final, el menor de los dos. Con deuda cara la capacidad es 0: no invertir todavía.
 */
export function riskProfile(
  answers: RiskAnswers,
  conditions: RiskCapacityInput,
  hasExpensiveDebt: boolean,
): RiskProfile {
  const dropPoints = answers.dropReaction === null ? null : DROP_POINTS[answers.dropReaction];
  const experiencePoints =
    answers.experience === null ? null : EXPERIENCE_POINTS[answers.experience];
  let willingness: number | null = null;
  if (dropPoints !== null && experiencePoints !== null) {
    const points = dropPoints + experiencePoints;
    willingness = points <= 3 ? 1 : points <= 5 ? 2 : 3;
  }
  const conditionsMet = Object.values(conditions).filter(Boolean).length;
  const capacity = hasExpensiveDebt || conditionsMet >= 4 ? 0 : Math.max(1, 3 - conditionsMet);
  const final = willingness === null ? null : Math.min(willingness, capacity);
  const level = (value: number | null) => (value === null ? null : RISK_LEVELS[value]!);
  return {
    dropPoints,
    experiencePoints,
    willingness,
    conditions,
    conditionsMet,
    capacity,
    final,
    willingnessLevel: level(willingness),
    capacityLevel: RISK_LEVELS[capacity]!,
    finalLevel: level(final),
  };
}
