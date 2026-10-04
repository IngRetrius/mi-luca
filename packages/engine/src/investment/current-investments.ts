import type { InvestmentBucket, Money } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/** Una inversión actual: plataforma o tipo, sin número de cuenta. */
export interface InvestmentInput {
  /** Sin tramo cuenta en el total, no en crecimiento ni en estabilidad. @excel Inversión!C6:C11 */
  readonly bucket: InvestmentBucket | null;
  /** @excel Inversión!D6:E11 */
  readonly balance: Money;
}

export interface CurrentInvestments {
  /** Saldo de cada inversión en moneda base. @excel Inversión!F6:F11 */
  readonly rows: readonly number[];
  /** @excel Inversión!F12 */
  readonly total: number;
  /** @excel Inversión!F13 */
  readonly growth: number;
  /** @excel Inversión!F14 */
  readonly stability: number;
}

/** Saldos invertidos hoy, en moneda base, en total y por tramo. */
export function currentInvestments(
  investments: readonly InvestmentInput[],
  fx: FxContext,
): CurrentInvestments {
  let growth = 0;
  let stability = 0;
  const rows = investments.map((investment) => {
    const value = toBaseCompat(investment.balance, fx);
    if (investment.bucket === 'crecimiento') growth += value;
    if (investment.bucket === 'estabilidad') stability += value;
    return value;
  });
  return { rows, total: rows.reduce((sum, value) => sum + value, 0), growth, stability };
}
