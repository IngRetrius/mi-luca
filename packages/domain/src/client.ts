import { z } from 'zod';

/** Tipo de cliente (`clients.client_type`): fija reglas del protocolo, sección 4. */
export const clientTypeSchema = z.enum([
  'empleado',
  'contratista',
  'independiente_variable',
  'pensionado',
  'rentista',
  'mixto',
]);
export type ClientType = z.infer<typeof clientTypeSchema>;
