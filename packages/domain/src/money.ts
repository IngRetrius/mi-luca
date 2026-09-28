import { z } from 'zod';

/** Código de moneda ISO 4217: tres letras mayúsculas, por ejemplo COP, EUR o USD. */
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'El código de moneda debe tener tres letras mayúsculas (ISO 4217).');

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

/** Todo importe de la plataforma lleva su moneda (RN-010). */
export const moneySchema = z.object({
  amount: z.number(),
  currency: currencyCodeSchema,
});

export type Money = z.infer<typeof moneySchema>;

/** Tasas del cliente: unidades de moneda base por una unidad de cada moneda extranjera (RN-017). */
export const fxRatesSchema = z.record(currencyCodeSchema, z.number().positive());

export type FxRates = z.infer<typeof fxRatesSchema>;
