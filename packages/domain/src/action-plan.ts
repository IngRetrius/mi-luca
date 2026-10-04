import { z } from 'zod';

/** Prioridad de una tarea del plan de acción (`action_items.priority`). @excel Listas!U2:U4 */
export const actionPrioritySchema = z.enum(['alta', 'media', 'baja']);
export type ActionPriority = z.infer<typeof actionPrioritySchema>;

/**
 * Quién hace la tarea (`action_items.owner_role`). Los profesionales externos solo se nombran
 * por su oficio, nunca por entidad (regla 11). @excel Listas!V2:V7
 */
export const actionOwnerSchema = z.enum([
  'cliente',
  'asesor',
  'contador',
  'abogado',
  'aseguradora',
  'administradora_pensiones',
]);
export type ActionOwner = z.infer<typeof actionOwnerSchema>;

/** Estado de una tarea (`action_items.status`). @excel Listas!W2:W4 */
export const actionStatusSchema = z.enum(['pendiente', 'en_curso', 'hecho']);
export type ActionStatus = z.infer<typeof actionStatusSchema>;
