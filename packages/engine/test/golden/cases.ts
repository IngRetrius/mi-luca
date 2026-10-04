/**
 * Casos de prueba de oro generados con tools/excel-extractor (recalc.py y golden.py).
 * Cada caso guarda las celdas por hoja: `inputs` (celdas de entrada) y `expected` (fórmulas con
 * el valor que calculó Excel). Para agregar un caso, genera su carpeta y regístralo aquí.
 */
import c10Case from './c10-inversion/case.json' with { type: 'json' };
import c10Expected from './c10-inversion/expected.json' with { type: 'json' };
import c10Inputs from './c10-inversion/inputs.json' with { type: 'json' };
import c11Case from './c11-seguimiento/case.json' with { type: 'json' };
import c11Expected from './c11-seguimiento/expected.json' with { type: 'json' };
import c11Inputs from './c11-seguimiento/inputs.json' with { type: 'json' };
import c1Case from './c1-colombia/case.json' with { type: 'json' };
import c1Expected from './c1-colombia/expected.json' with { type: 'json' };
import c1Inputs from './c1-colombia/inputs.json' with { type: 'json' };
import c2Case from './c2-espana/case.json' with { type: 'json' };
import c2Expected from './c2-espana/expected.json' with { type: 'json' };
import c2Inputs from './c2-espana/inputs.json' with { type: 'json' };
import c4Case from './c4-deudas/case.json' with { type: 'json' };
import c4Expected from './c4-deudas/expected.json' with { type: 'json' };
import c4Inputs from './c4-deudas/inputs.json' with { type: 'json' };
import c5Case from './c5-creditos/case.json' with { type: 'json' };
import c5Expected from './c5-creditos/expected.json' with { type: 'json' };
import c5Inputs from './c5-creditos/inputs.json' with { type: 'json' };
import c6Case from './c6-ingreso-variable/case.json' with { type: 'json' };
import c6Expected from './c6-ingreso-variable/expected.json' with { type: 'json' };
import c6Inputs from './c6-ingreso-variable/inputs.json' with { type: 'json' };
import c3Case from './c3-plantilla-vacia/case.json' with { type: 'json' };
import c3Expected from './c3-plantilla-vacia/expected.json' with { type: 'json' };
import c3Inputs from './c3-plantilla-vacia/inputs.json' with { type: 'json' };
import c7Case from './c7-metas-seguros/case.json' with { type: 'json' };
import c7Expected from './c7-metas-seguros/expected.json' with { type: 'json' };
import c7Inputs from './c7-metas-seguros/inputs.json' with { type: 'json' };
import c8Case from './c8-saldos-cobros/case.json' with { type: 'json' };
import c8Expected from './c8-saldos-cobros/expected.json' with { type: 'json' };
import c8Inputs from './c8-saldos-cobros/inputs.json' with { type: 'json' };
import c9Case from './c9-bola-de-nieve/case.json' with { type: 'json' };
import c9Expected from './c9-bola-de-nieve/expected.json' with { type: 'json' };
import c9Inputs from './c9-bola-de-nieve/inputs.json' with { type: 'json' };

export type CellValue = string | number | boolean | null;
export type Sheets = Readonly<Record<string, Readonly<Record<string, CellValue>>>>;

export interface GoldenCase {
  readonly case: string;
  readonly template: string;
  readonly cutoffCell: string;
  readonly cutoffDate: string;
  readonly inputCells: number;
  readonly formulaCells: number;
  readonly inputs: Sheets;
  readonly expected: Sheets;
}

export const goldenCases: readonly GoldenCase[] = [
  { ...c1Case, inputs: c1Inputs as Sheets, expected: c1Expected as Sheets },
  { ...c2Case, inputs: c2Inputs as Sheets, expected: c2Expected as Sheets },
  { ...c3Case, inputs: c3Inputs as Sheets, expected: c3Expected as Sheets },
  { ...c4Case, inputs: c4Inputs as Sheets, expected: c4Expected as Sheets },
  { ...c6Case, inputs: c6Inputs as Sheets, expected: c6Expected as Sheets },
  { ...c7Case, inputs: c7Inputs as Sheets, expected: c7Expected as Sheets },
  { ...c8Case, inputs: c8Inputs as Sheets, expected: c8Expected as Sheets },
  { ...c9Case, inputs: c9Inputs as Sheets, expected: c9Expected as Sheets },
  { ...c10Case, inputs: c10Inputs as Sheets, expected: c10Expected as Sheets },
  { ...c11Case, inputs: c11Inputs as Sheets, expected: c11Expected as Sheets },
];

/** Casos sobre la plantilla de créditos (`Plantilla_Creditos.xlsx`): otras hojas y otras pruebas. */
export const creditCases: readonly GoldenCase[] = [
  { ...c5Case, inputs: c5Inputs as Sheets, expected: c5Expected as Sheets },
];

/** Valor de una celda del caso: primero en las entradas y luego en las fórmulas. Vacía es undefined. */
export function cell(golden: GoldenCase, ref: string): CellValue | undefined {
  const [sheet, address] = ref.split('!');
  if (sheet === undefined || address === undefined) throw new Error(`Referencia inválida: ${ref}`);
  return golden.inputs[sheet]?.[address] ?? golden.expected[sheet]?.[address];
}

/**
 * Equivalente a N() de Excel para valores de celda: números igual, verdadero 1 y el resto 0.
 * Las fechas llegan como texto "AAAA-MM-DD" y aquí valen 0; conviértelas antes si hace falta.
 */
export function excelN(value: CellValue | undefined): number {
  if (typeof value === 'number') return value;
  return value === true ? 1 : 0;
}
