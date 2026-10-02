import { z } from 'zod';

/**
 * Frecuencia de una partida del presupuesto (`budget_items.frequency`). Las dos últimas no tienen
 * un número fijo de veces al año: `por_duracion` sale de los días que dura, y
 * `meses_seguridad_social` de los meses en que se paga seguridad social (RN-020, RN-021).
 */
export const frequencySchema = z.enum([
  'semanal',
  'quincenal',
  'mensual',
  'bimestral',
  'trimestral',
  'cada_4_meses',
  'semestral',
  'anual',
  'cada_2_anos',
  'por_duracion',
  'meses_seguridad_social',
]);
export type Frequency = z.infer<typeof frequencySchema>;

/** Tipo de gasto (`budget_items.expense_type`): cómo sale el dinero (RN-022). */
export const expenseTypeSchema = z.enum(['directo', 'bolsillo', 'seg_social', 'deuda', 'ahorro']);
export type ExpenseType = z.infer<typeof expenseTypeSchema>;

/** Tipo de ingreso (`incomes.kind`). */
export const incomeKindSchema = z.enum(['laboral', 'renta', 'pension', 'otro']);
export type IncomeKind = z.infer<typeof incomeKindSchema>;

/**
 * En qué escenario del fondo de emergencia se pierde un ingreso (`incomes.lost_in_scenario`,
 * H-07): `a` si pierde el ingreso laboral, `b` si pierde las rentas, `c` solo en el peor caso y
 * `ninguno` si se mantiene siempre. Sin marca vale la regla de la plantilla según el tipo.
 */
export const incomeScenarioSchema = z.enum(['a', 'b', 'c', 'ninguno']);
export type IncomeScenario = z.infer<typeof incomeScenarioSchema>;

/** Quién paga una partida (`budget_items.payer`, RN-015). */
export const payerSchema = z.enum(['cliente', 'familia', 'tercero']);
export type Payer = z.infer<typeof payerSchema>;

/** Una marca por mes, de enero a diciembre: cuántos pagos hay ese mes (normalmente 0 o 1). */
export type MonthFlags = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
