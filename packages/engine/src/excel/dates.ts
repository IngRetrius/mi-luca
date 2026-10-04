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

/**
 * Años completos entre dos fechas, como `DATEDIF(inicio, fin, "y")`: el año cuenta solo si el mes
 * y el día de la fecha final llegan a los de la inicial (del 29 de febrero al 28 de febrero de un
 * año sin bisiesto no se cumple el año). Null donde Excel da #NUM!: fecha final anterior.
 */
export function datedifYears(start: IsoDate, end: IsoDate): number | null {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (end < start) return null;
  const years = to.year - from.year;
  return to.month < from.month || (to.month === from.month && to.day < from.day)
    ? years - 1
    : years;
}

function isoDate({ year, month, day }: CalendarDate): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * La misma fecha `months` meses después (o antes, si es negativo), como `EDATE(inicio, meses)`:
 * los meses se truncan a entero y, si el día no existe en el mes final, queda el último día del
 * mes (del 31 de enero, un mes después es el 28 de febrero).
 */
export function edate(start: IsoDate, months: number): IsoDate {
  const from = parseIsoDate(start);
  const index = from.year * 12 + (from.month - 1) + Math.trunc(months);
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return isoDate({ year, month, day: Math.min(from.day, daysInMonth(year, month)) });
}

/** Índice del mes de una fecha, `AÑO*12 + MES`, como lo usa la plantilla para comparar meses. */
export function monthIndex(date: IsoDate): number {
  const { year, month } = parseIsoDate(date);
  return year * 12 + month;
}

/**
 * Número de serie de Excel de una fecha (días desde el 30/12/1899). Sirve para restar fechas en
 * días, como hace Excel con `fecha1 - fecha2`.
 */
export function excelSerial(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
}
