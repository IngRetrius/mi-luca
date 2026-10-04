import { z } from 'zod';

/** Tramo de una inversión (`investments.bucket`). Sin tramo cuenta en el total, no en los tramos. */
export const investmentBucketSchema = z.enum(['crecimiento', 'estabilidad']);
export type InvestmentBucket = z.infer<typeof investmentBucketSchema>;

/** "Si su inversión bajara 15 % en un año, ¿qué haría?" (`risk_profile.drop_reaction`). */
export const dropReactionSchema = z.enum(['venderia', 'esperaria', 'invertiria_mas']);
export type DropReaction = z.infer<typeof dropReactionSchema>;

/** "¿Qué experiencia tiene invirtiendo?" (`risk_profile.experience`). */
export const investingExperienceSchema = z.enum(['ninguna', 'algo', 'bastante']);
export type InvestingExperience = z.infer<typeof investingExperienceSchema>;

/** Plazo en que podría necesitar el dinero (`risk_profile.horizon`). No suma puntos. */
export const moneyHorizonSchema = z.enum(['menos_3', 'de_3_a_7', 'mas_7']);
export type MoneyHorizon = z.infer<typeof moneyHorizonSchema>;

/** Nivel de riesgo, de 0 a 3, en el orden de `Inversión!E31` y `E32`. */
export const riskLevelSchema = z.enum(['no_invertir', 'conservador', 'moderado', 'tolerante']);
export type RiskLevel = z.infer<typeof riskLevelSchema>;
