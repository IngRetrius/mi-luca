import { budgetCatalog } from '@miluca/i18n';

import type { InsuranceType } from './validation';

/** Conceptos del catálogo del presupuesto que son un seguro que ya se paga (ADR 0028). */
const CATALOG_KEYS: Readonly<Partial<Record<InsuranceType, readonly string[]>>> = {
  vehiculo: ['car-insurance'],
  complementario: ['private-health-plan'],
};

/**
 * Para cada tipo de seguro, el gasto del presupuesto que lo paga, si lo hay: el que tiene el nombre
 * del concepto del catálogo del país (en español o en inglés, según con qué idioma se agregó). Sirve
 * para que el asesor no pregunte dos veces por un seguro que ya está en el presupuesto.
 */
export function budgetedInsurance(
  countryCode: string,
  concepts: readonly string[],
): Partial<Record<InsuranceType, string>> {
  const names = new Map<string, string>();
  for (const language of ['es', 'en'] as const) {
    for (const category of budgetCatalog(countryCode, language)) {
      for (const concept of category.concepts) {
        names.set(concept.name.toLocaleLowerCase('es'), concept.key);
      }
    }
  }
  const found: Partial<Record<InsuranceType, string>> = {};
  for (const concept of concepts) {
    const key = names.get(concept.toLocaleLowerCase('es'));
    if (!key) continue;
    for (const [type, keys] of Object.entries(CATALOG_KEYS) as [InsuranceType, string[]][]) {
      if (keys.includes(key) && !found[type]) found[type] = concept;
    }
  }
  return found;
}
