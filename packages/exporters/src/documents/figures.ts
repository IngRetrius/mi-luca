import type { KeyFigureId } from '@miluca/engine';

/**
 * Marcador de cada cifra clave dentro del texto de la carta y las notas: `{{sobrante_anual}}`. Va
 * en español porque el asesor lo ve al escribir; el código usa la llave del motor. Si se agrega
 * una cifra clave, se agrega aquí (la prueba lo exige).
 */
export const FIGURE_MARKERS: Readonly<Record<KeyFigureId, string>> = {
  annualIncome: 'ingreso_anual',
  annualExpenses: 'gasto_anual',
  monthlyExpenses: 'gasto_mensual',
  programmedSavings: 'ahorro_programado',
  annualSurplus: 'sobrante_anual',
  savingsRate: 'tasa_de_ahorro',
  essentialMonthly: 'gasto_esencial_mensual',
  basicMonthly: 'costo_basico_mensual',
  ownSavingsRate: 'tasa_de_ahorro_propia',
  debtLoad: 'carga_de_deuda',
  totalDebt: 'deuda_total',
  expensiveDebtMonths: 'meses_para_salir_de_deuda_cara',
  emergencyGoal: 'meta_del_fondo',
  emergencyProgress: 'avance_del_fondo',
  noIncomeShortfall: 'faltante_de_meses_sin_ingreso',
  annualInvestment: 'inversion_del_ano',
  growthShare: 'porcentaje_en_crecimiento',
  netWorth: 'patrimonio_neto',
};

const MARKER = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;
const ID_BY_MARKER = new Map(
  Object.entries(FIGURE_MARKERS).map(([id, marker]) => [marker, id as KeyFigureId]),
);

/** El marcador que se escribe en el texto para una cifra. */
export function figureMarker(id: KeyFigureId): string {
  return `{{${FIGURE_MARKERS[id]}}}`;
}

/** Marcadores del texto que no son de ninguna cifra, sin repetir, en el orden en que aparecen. */
export function unknownMarkers(text: string): string[] {
  const unknown = new Set<string>();
  for (const match of text.matchAll(MARKER)) {
    const name = match[1] ?? '';
    if (!ID_BY_MARKER.has(name)) unknown.add(name);
  }
  return [...unknown];
}

/**
 * Cambia cada marcador por el valor ya escrito de su cifra (`values`, con el formato del país). Un
 * marcador desconocido o una cifra sin valor quedan como "—": la carta nunca muestra llaves.
 */
export function fillFigures(
  text: string,
  values: Readonly<Partial<Record<KeyFigureId, string>>>,
): string {
  return text.replace(MARKER, (_, name: string) => {
    const id = ID_BY_MARKER.get(name);
    return (id && values[id]) || '—';
  });
}
