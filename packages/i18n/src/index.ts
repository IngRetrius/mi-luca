import es from '../messages/es.json' with { type: 'json' };

export { formatDate, formatMoney, formatPercent } from './format';
export type { MoneyFormatOptions } from './format';
export { BUDGET_CATALOGS, budgetCatalog } from './budget-catalog';
export type { BudgetCatalog, CatalogCategory, CatalogConcept } from './budget-catalog';
export { COUNTRY_LOCALES } from './locales';
export type { CountryLocale } from './locales';

export const messages = { es } as const;
export type Messages = typeof es;
