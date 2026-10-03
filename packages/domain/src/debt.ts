import { z } from 'zod';

/**
 * Orden en que se pagan las deudas (`debt_strategy.method`, RN-091): avalancha (mayor tasa
 * primero, ahorra más), bola de nieve (menor saldo primero, motiva más) u orden manual.
 */
export const debtMethodSchema = z.enum(['avalancha', 'bola_de_nieve', 'manual']);
export type DebtMethod = z.infer<typeof debtMethodSchema>;
