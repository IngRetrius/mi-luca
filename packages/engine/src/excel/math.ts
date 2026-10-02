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
