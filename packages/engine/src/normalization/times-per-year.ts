import type { Frequency } from '@miluca/domain';

/** Veces al año de las frecuencias fijas (`Listas!C2:D10` de la plantilla). */
export const FIXED_TIMES_PER_YEAR: Readonly<
  Record<Exclude<Frequency, 'por_duracion' | 'meses_seguridad_social'>, number>
> = {
  semanal: 52,
  quincenal: 24,
  mensual: 12,
  bimestral: 6,
  trimestral: 4,
  cada_4_meses: 3,
  semestral: 2,
  anual: 1,
  cada_2_anos: 0.5,
};

/**
 * Veces al año que se paga una partida (RN-020, RN-021). Sin frecuencia devuelve `null` (la celda
 * queda vacía y la partida no suma); "por duración" divide 365 entre los días que dura, o 0 si no
 * hay días; "meses con seguridad social" usa los meses marcados en Ingresos.
 *
 * @excel Presupuesto!G6:G87 — IF(E="","",IF(E="Por duración (días)",IF(N(F)>0,365/F,0),
 *   IF(E="Meses con seguridad social",Ingresos!$S$17,IFERROR(VLOOKUP(E,Listas!$C$2:$D$10,2,FALSE()),0))))
 */
export function timesPerYear(
  frequency: Frequency | null,
  durationDays: number | null,
  socialSecurityPayments: number,
): number | null {
  if (frequency === null) return null;
  if (frequency === 'por_duracion') {
    return durationDays !== null && durationDays > 0 ? 365 / durationDays : 0;
  }
  if (frequency === 'meses_seguridad_social') return socialSecurityPayments;
  return FIXED_TIMES_PER_YEAR[frequency];
}
