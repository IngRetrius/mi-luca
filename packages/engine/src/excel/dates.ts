import type { IsoDate } from '@miluca/domain';

export interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Separa una fecha "AAAA-MM-DD" sin pasar por `Date`, para no depender de la zona horaria. */
export function parseIsoDate(date: IsoDate): CalendarDate {
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error(`Fecha inválida: ${date}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Fecha inválida: ${date}`);
  }
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Meses completos entre dos fechas, como `DATEDIF(inicio, fin, "m")`: el mes cuenta solo si el día
 * de la fecha final llega al de la inicial (del 31 de enero al 28 de febrero son 0 meses).
 * Devuelve null donde Excel da #NUM!, es decir, si la fecha final es anterior a la inicial.
 */
export function datedifMonths(start: IsoDate, end: IsoDate): number | null {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (end < start) return null; // "AAAA-MM-DD" ya validadas se ordenan como texto
  const months = (to.year - from.year) * 12 + (to.month - from.month);
  return to.day < from.day ? months - 1 : months;
}
