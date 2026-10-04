import type { AssetType, Money } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/** Un activo de Patrimonio: cuenta, bolsillo, efectivo, inmueble, vehículo u otro. */
export interface AssetInput {
  readonly assetType: AssetType;
  readonly value: Money;
}

/**
 * Saldo líquido disponible: cuentas, bolsillos y efectivo, en moneda base (RN-110). Es lo que se
 * reparte entre los bolsillos.
 *
 * @excel Patrimonio!C33
 */
export function liquidAssets(assets: readonly AssetInput[], fx: FxContext): number {
  let total = 0;
  for (const asset of assets) {
    if (asset.assetType === 'liquido') total += toBaseCompat(asset.value, fx);
  }
  return total;
}
