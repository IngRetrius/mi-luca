/** Supuestos de la proyección; los fija la metodología o el asesor. */
export interface ProjectionParameters {
  /** Rendimiento real anual supuesto del tramo de crecimiento (RN-116). @excel Supuestos!C27 */
  readonly realReturnGrowth: number;
  /** @excel Supuestos!C28 */
  readonly realReturnStability: number;
  /** Puntos que baja cada año el % en crecimiento en los 10 años antes del retiro. @excel Supuestos!C30 */
  readonly glideStep: number;
  /** Piso del % en crecimiento (RN-115). @excel Supuestos!C31 */
  readonly growthFloor: number;
}

export interface ProjectionInput {
  /** Año del flujo: la proyección empieza ahí. @excel Supuestos!C14 */
  readonly firstYear: number;
  /** Año de nacimiento; null sin fecha. */
  readonly birthYear: number | null;
  /** Años que faltan para el retiro desde la fecha de corte. @excel Inversión!C71 */
  readonly yearsToRetirement: number;
  /** % en crecimiento de hoy. @excel Inversión!C45 */
  readonly growthShare: number;
  /** Saldo invertido hoy más el aporte único. @excel Inversión!C55 */
  readonly startingBalance: number;
  /** Aporte del sobrante, igual cada año. @excel Flujo anual!Q25 */
  readonly annualContribution: number;
  /** Abonos de cobros a inversión de cada año de la proyección (10). */
  readonly receivablesByYear: readonly number[];
  readonly parameters: ProjectionParameters;
}

export interface ProjectionYear {
  /** @excel Inversión!B61:B70 */
  readonly year: number;
  /** Edad al cierre del año; null sin fecha de nacimiento. @excel Inversión!C61:C70 */
  readonly ageAtClose: number | null;
  /** @excel Inversión!D61:D70 */
  readonly growthShare: number;
  /** @excel Inversión!E61:E70 */
  readonly blendedReturn: number;
  /** @excel Inversión!F61:F70 */
  readonly startBalance: number;
  /** @excel Inversión!G61:G70 */
  readonly contribution: number;
  /** @excel Inversión!H61:H70 */
  readonly receivables: number;
  /** Los aportes del año rinden la mitad del año. @excel Inversión!I61:I70 */
  readonly returnAmount: number;
  /** @excel Inversión!J61:J70 */
  readonly endBalance: number;
}

/** Años de la proyección (RN-116). */
export const PROJECTION_YEARS = 10;

/**
 * Proyección ilustrativa a 10 años en dinero de hoy, con rendimientos reales supuestos y no
 * garantizados (RN-115, RN-116). El % en crecimiento baja `glideStep` por año en los 10 años
 * antes del retiro, sin pasar del piso (ni del % de hoy, si es menor). Igual que la plantilla, los
 * años al retiro se cuentan desde la fecha de corte aunque la tabla empiece en el año del flujo
 * (H-09) y el aporte del sobrante es el mismo todos los años.
 */
export function projection(input: ProjectionInput): ProjectionYear[] {
  const { parameters: p, yearsToRetirement: toRetire, growthShare } = input;
  const rows: ProjectionYear[] = [];
  let startBalance = input.startingBalance;
  for (let k = 0; k < PROJECTION_YEARS; k++) {
    const year = input.firstYear + k;
    const gliding = Math.max(0, Math.min(k, toRetire) - Math.max(0, toRetire - 10));
    const share =
      growthShare === 0
        ? 0
        : Math.max(Math.min(p.growthFloor, growthShare), growthShare - p.glideStep * gliding);
    const blendedReturn = share * p.realReturnGrowth + (1 - share) * p.realReturnStability;
    const contribution = input.annualContribution;
    const receivables = input.receivablesByYear[k] ?? 0;
    const returnAmount = (startBalance + (contribution + receivables) / 2) * blendedReturn;
    const endBalance = startBalance + contribution + receivables + returnAmount;
    rows.push({
      year,
      ageAtClose: input.birthYear === null ? null : year - input.birthYear,
      growthShare: share,
      blendedReturn,
      startBalance,
      contribution,
      receivables,
      returnAmount,
      endBalance,
    });
    startBalance = endBalance;
  }
  return rows;
}
