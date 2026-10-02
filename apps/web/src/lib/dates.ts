import type { IsoDate } from '@miluca/domain';

/** Zona horaria de cada país habilitado, para saber qué día es "hoy" para el cliente. */
const TIME_ZONES: Readonly<Record<string, string>> = {
  CO: 'America/Bogota',
  ES: 'Europe/Madrid',
};

/**
 * La fecha de hoy ("AAAA-MM-DD") en el país del cliente. Es la fecha de corte cuando el asesor no
 * fijó otra; el motor la recibe como dato y nunca lee el reloj (CLAUDE.md, regla 5).
 */
export function todayIn(countryCode: string, now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONES[countryCode] ?? 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Nombres de los meses en el idioma del país, de enero a diciembre: cortos y completos. */
export function monthNames(locale: string): { short: string[]; long: string[] } {
  const names = (month: 'short' | 'long') =>
    Array.from({ length: 12 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { month, timeZone: 'UTC' }).format(Date.UTC(2026, index, 1)),
    );
  return { short: names('short'), long: names('long') };
}
