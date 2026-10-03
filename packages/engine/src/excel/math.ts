/**
 * Redondeo hacia afuera del cero, como `ROUNDUP(valor, decimales)`: `ROUNDUP(2.1, 0)` es 3 y
 * `ROUNDUP(-2.1, 0)` es -3. Antes de subir, se quitan los errores de la representación binaria
 * en el decimal 15 (Excel trabaja con 15 cifras significativas), para que 0,1 * 3 no suba a 0,31.
 */
export function roundUp(value: number, digits: number): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const factor = 10 ** Math.trunc(digits);
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  return (Math.sign(value) * Math.ceil(scaled)) / factor;
}

/**
 * Número de pagos para saldar `presentValue` con pagos iguales al final de cada periodo, como
 * `NPER(tasa, pago, valor_actual)` con valor futuro 0. El pago va con signo contrario al saldo,
 * como en Excel (`NPER(tasa, -cuota, saldo)`). Devuelve null donde Excel da #NUM!: cuando la
 * cuota no alcanza a cubrir el interés del periodo y el saldo nunca baja.
 */
export function nper(rate: number, payment: number, presentValue: number): number | null {
  if (rate === 0) return payment === 0 ? null : -presentValue / payment;
  const ratio = payment / (payment + presentValue * rate);
  if (!(ratio > 0) || !Number.isFinite(ratio)) return null;
  return Math.log(ratio) / Math.log(1 + rate);
}

/**
 * Pago periódico que salda `presentValue` en `periods` pagos iguales al final de cada periodo,
 * como `PMT(tasa, periodos, -valor_actual)` con valor futuro 0. Positivo para un saldo positivo.
 */
export function pmt(rate: number, periods: number, presentValue: number): number {
  if (rate === 0) return presentValue / periods;
  return (presentValue * rate) / (1 - (1 + rate) ** -periods);
}
