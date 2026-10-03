/** Las celdas de la plantilla de créditos (caso C5) como entradas del motor. */
import {
  CREDIT_HORIZON_INSTALLMENTS,
  type CreditInput,
  type InstallmentMark,
} from '../../src/credits';
import { cell, excelN, type GoldenCase } from './cases';

const FIRST_ROW = 27;

export function numberOrNull(golden: GoldenCase, ref: string): number | null {
  const value = cell(golden, ref);
  return typeof value === 'number' ? value : null;
}

/** Las celdas de datos de una hoja "Crédito k" como entrada del motor. */
export function creditInput(golden: GoldenCase, sheet: string): CreditInput {
  return {
    balance: excelN(cell(golden, `${sheet}!C9`)),
    firstInstallmentDate: String(cell(golden, `${sheet}!C10`)),
    firstInstallmentNumber: excelN(cell(golden, `${sheet}!C11`)),
    totalInstallments: numberOrNull(golden, `${sheet}!C12`),
    annualRate: numberOrNull(golden, `${sheet}!C13`),
    payment: numberOrNull(golden, `${sheet}!C14`),
    insurance: excelN(cell(golden, `${sheet}!C15`)),
    originalAmount: numberOrNull(golden, `${sheet}!C16`),
    acceptsExtra: cell(golden, `${sheet}!C17`) !== 'No',
    extraFromInstallment: numberOrNull(golden, `${sheet}!C18`),
    frechPoints: numberOrNull(golden, `${sheet}!C19`),
    frechUntilInstallment: numberOrNull(golden, `${sheet}!C20`),
  };
}

/** Marcas de las columnas I, J y O de la tabla ("Sí" o "Si" es pagada). */
export function creditMarks(golden: GoldenCase, sheet: string, first: number): InstallmentMark[] {
  return Array.from({ length: CREDIT_HORIZON_INSTALLMENTS }, (_, k) => {
    const row = FIRST_ROW + k;
    const paidText = cell(golden, `${sheet}!O${row}`);
    return {
      installmentNumber: first + k,
      paid: paidText === 'Sí' || paidText === 'Si',
      customPayment: numberOrNull(golden, `${sheet}!I${row}`),
      extraPayment: numberOrNull(golden, `${sheet}!J${row}`),
    };
  }).filter((mark) => mark.paid || mark.customPayment !== null || mark.extraPayment !== null);
}
