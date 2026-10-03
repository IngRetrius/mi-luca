import type { ExpenseType, Frequency } from '@miluca/domain';

/**
 * Un concepto típico del presupuesto con lo que la plantilla sugiere para él (`Presupuesto!B:K`).
 * Es un punto de partida: el asesor o el cliente lo cambian después en el gasto guardado.
 */
export interface CatalogConcept {
  /** Llave estable. Es la misma en todos los países cuando el concepto es equivalente. */
  readonly key: string;
  readonly name: string;
  readonly frequency: Frequency;
  readonly expenseType: ExpenseType;
  /** Bolsillo sugerido, solo en los de tipo bolsillo (`Presupuesto!K`). */
  readonly pocket: string | null;
  readonly essential: boolean;
  /** Gasto con datos de salud (C20): pierde el detalle si se retira ese consentimiento. */
  readonly health: boolean;
  /** Nota corta de la plantilla (`Presupuesto!M`), si tiene. */
  readonly hint: string | null;
}

export interface CatalogCategory {
  readonly name: string;
  readonly concepts: readonly CatalogConcept[];
}

/**
 * Conceptos típicos de un país, por categoría y en el orden en que se preguntan. No incluye las
 * filas automáticas de la plantilla (cuotas de deudas, seguros nuevos y metas): las suma el motor.
 */
export type BudgetCatalog = readonly CatalogCategory[];

interface ConceptOptions {
  readonly essential?: boolean;
  readonly pocket?: string;
  readonly health?: boolean;
  readonly hint?: string;
}

/** Arma un concepto del catálogo; lo que no se indica queda en no o vacío. */
export function concept(
  key: string,
  name: string,
  frequency: Frequency,
  expenseType: ExpenseType,
  options: ConceptOptions = {},
): CatalogConcept {
  return {
    key,
    name,
    frequency,
    expenseType,
    pocket: options.pocket ?? null,
    essential: options.essential ?? false,
    health: options.health ?? false,
    hint: options.hint ?? null,
  };
}
