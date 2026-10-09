import { describe, expect, it } from 'vitest';

import type { EmergencyFund } from '@miluca/engine';

import { relevantScenarios } from './scenarios';

const scenario = (keptIncome: number) => ({ keptIncome }) as EmergencyFund['scenarios']['a'];

describe('escenarios del fondo que aplican', () => {
  it('solo salario: pierde el trabajo; sin rentas ni un peor caso repetido', () => {
    const scenarios = { a: scenario(0), b: scenario(7_000_000), c: scenario(0) };
    expect(relevantScenarios(scenarios, 7_000_000)).toEqual(['a']);
  });

  it('salario y arriendo: los tres', () => {
    const scenarios = { a: scenario(2_000_000), b: scenario(5_000_000), c: scenario(0) };
    expect(relevantScenarios(scenarios, 7_000_000)).toEqual(['a', 'b', 'c']);
  });

  it('solo rentas: perder el trabajo no cambia nada, pero se muestra; el peor caso es el de rentas', () => {
    const scenarios = { a: scenario(3_000_000), b: scenario(0), c: scenario(0) };
    expect(relevantScenarios(scenarios, 3_000_000)).toEqual(['a', 'b']);
  });
});
