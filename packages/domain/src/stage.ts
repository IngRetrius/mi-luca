import { z } from 'zod';

/**
 * Etapas de la asesoría (ADR 0025), en el orden sugerido. El núcleo (perfil, ingresos, monedas y
 * supuestos) no es una etapa: siempre está activo.
 */
export const CASE_STAGES = ['presupuesto', 'deudas', 'patrimonio'] as const;
export const caseStageSchema = z.enum(CASE_STAGES);
export type CaseStage = z.infer<typeof caseStageSchema>;

/** De qué es un plan entregado: una etapa o el plan completo (las entregas anteriores al ADR 0025). */
export const deliveryStageSchema = z.enum([...CASE_STAGES, 'completo']);
export type DeliveryStage = z.infer<typeof deliveryStageSchema>;

/**
 * Las etapas activas guardadas, sin repetidas, sin valores desconocidos y en el orden sugerido. Sin
 * fila de supuestos vale `presupuesto`, como el valor por defecto de la columna.
 */
export function normalizeStages(value: readonly string[] | null | undefined): CaseStage[] {
  if (value === null || value === undefined) return ['presupuesto'];
  const saved = new Set(value);
  return CASE_STAGES.filter((stage) => saved.has(stage));
}
