import type { EmergencyFund } from '@miluca/engine';

export type ScenarioId = 'a' | 'b' | 'c';

/** Medio peso: por debajo, dos ingresos que se mantienen son el mismo. */
const TOLERANCE = 0.5;

/**
 * Los escenarios del fondo que dicen algo con los ingresos del caso (ADR 0028): el de perder el
 * trabajo siempre; el de perder las rentas, solo si alguna renta se pierde; el peor caso, solo si
 * es distinto de los otros dos. Así, a quien solo tiene salario no se le muestra "pierde las rentas"
 * ni un peor caso igual al primero. `monthlyIncome` es el ingreso mensual total del caso.
 */
export function relevantScenarios(
  scenarios: EmergencyFund['scenarios'],
  monthlyIncome: number,
): ScenarioId[] {
  const same = (x: number, y: number) => Math.abs(x - y) <= TOLERANCE;
  const shown: ScenarioId[] = ['a'];
  if (!same(scenarios.b.keptIncome, monthlyIncome)) shown.push('b');
  const worst = scenarios.c.keptIncome;
  if (!same(worst, scenarios.a.keptIncome) && !same(worst, scenarios.b.keptIncome)) shown.push('c');
  return shown;
}
