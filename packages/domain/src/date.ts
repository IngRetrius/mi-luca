import { z } from 'zod';

/** Fecha de calendario sin hora ni zona, "AAAA-MM-DD" (fecha de corte, fecha objetivo). */
export const isoDateSchema = z.iso.date();

export type IsoDate = z.infer<typeof isoDateSchema>;
