import type { AssetType } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import type { AssetInput } from './liquid-assets';

/**
 * Grupos de la composición, en el orden de `Patrimonio!B33:B38`. Inversiones y cuentas por cobrar
 * salen de sus módulos; los demás, de los activos.
 */
export type NetWorthGroup = AssetType | 'inversion' | 'por_cobrar';

export const NET_WORTH_GROUPS: readonly NetWorthGroup[] = [
  'liquido',
  'inversion',
  'inmueble',
  'vehiculo',
  'por_cobrar',
  'otro',
];

export interface NetWorthInput {
  readonly assets: readonly AssetInput[];
  /** Total invertido hoy, en moneda base. @excel Patrimonio!F6 (Inversión!F12) */
  readonly investments: number;
  /** Saldo pendiente por cobrar en la fecha de corte. @excel Patrimonio!F7 (Supuestos!I49) */
  readonly receivables: number;
  /** Saldo total de deudas. @excel Patrimonio!F29 (Deudas!D21) */
  readonly debts: number;
}

export interface NetWorthGroupValue {
  /** @excel Patrimonio!C33:C38 */
  readonly value: number;
  /** Parte de los activos; 0 sin activos. @excel Patrimonio!D33:D38 */
  readonly share: number;
}

export interface NetWorth {
  /** Valor de cada activo en moneda base, en el orden de la entrada. @excel Patrimonio!F8:F27 */
  readonly assetValues: readonly number[];
  /** @excel Patrimonio!F28 */
  readonly totalAssets: number;
  /** @excel Patrimonio!F29 */
  readonly debts: number;
  /** Activos menos deudas (RN-110). @excel Patrimonio!F30, Resumen!C33 */
  readonly netWorth: number;
  readonly composition: Readonly<Record<NetWorthGroup, NetWorthGroupValue>>;
  /** Inmuebles y vehículos sobre activos; 0 sin activos. @excel Patrimonio!C39, Resumen!C34 */
  readonly concentration: number;
}

/** Referencia de concentración: más de 80 % en inmuebles y vehículos es poco líquido (RN-110). */
export const CONCENTRATION_THRESHOLD = 0.8;

/** Patrimonio completo: activos, inversiones y cobros menos deudas, y su composición. */
export function computeNetWorth(input: NetWorthInput, fx: FxContext): NetWorth {
  const values: Record<NetWorthGroup, number> = {
    liquido: 0,
    inversion: input.investments,
    inmueble: 0,
    vehiculo: 0,
    por_cobrar: input.receivables,
    otro: 0,
  };
  const assetValues = input.assets.map((asset) => {
    const value = toBaseCompat(asset.value, fx);
    values[asset.assetType] += value;
    return value;
  });
  const totalAssets =
    input.investments + input.receivables + assetValues.reduce((sum, value) => sum + value, 0);
  const share = (value: number) => (totalAssets === 0 ? 0 : value / totalAssets);
  const composition = Object.fromEntries(
    NET_WORTH_GROUPS.map((group) => [group, { value: values[group], share: share(values[group]) }]),
  ) as Record<NetWorthGroup, NetWorthGroupValue>;
  return {
    assetValues,
    totalAssets,
    debts: input.debts,
    netWorth: totalAssets - input.debts,
    composition,
    concentration: share(values.inmueble + values.vehiculo),
  };
}
