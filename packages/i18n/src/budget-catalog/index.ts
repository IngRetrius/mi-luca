import type { BudgetCatalog } from './catalog';
import { CO_CATALOG } from './co';
import { ES_CATALOG } from './es';

export type { BudgetCatalog, CatalogCategory, CatalogConcept } from './catalog';

/**
 * Catálogo de conceptos del presupuesto por país (código ISO de `countries`). Para habilitar un
 * país nuevo se agrega su archivo con la misma estructura y una línea aquí; la prueba del paquete
 * exige un catálogo por cada país de `COUNTRY_LOCALES`.
 */
export const BUDGET_CATALOGS: Readonly<Record<string, BudgetCatalog>> = {
  CO: CO_CATALOG,
  ES: ES_CATALOG,
};

/** El catálogo del país del cliente; vacío si el país todavía no tiene uno. */
export function budgetCatalog(countryCode: string): BudgetCatalog {
  return BUDGET_CATALOGS[countryCode] ?? [];
}
