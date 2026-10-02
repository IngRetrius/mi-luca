import { z } from 'zod';

/** ¿El cliente ya tiene el seguro? (`insurances.status`). Solo "si" queda fuera de los nuevos. */
export const insuranceStatusSchema = z.enum(['si', 'no', 'cotizando']);
export type InsuranceStatus = z.infer<typeof insuranceStatusSchema>;
