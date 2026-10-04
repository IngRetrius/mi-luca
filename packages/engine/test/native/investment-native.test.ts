import { describe, expect, it } from 'vitest';

import { compute } from '../../src/compute';
import { caseInput } from '../golden/adapters';
import { goldenCases } from '../golden/cases';

const c10 = goldenCases.find((golden) => golden.case === 'c10-inversion')!;

describe('suma asegurada de vida con años y gasto del asesor (H-10)', () => {
  const input = caseInput(c10);
  const custom = {
    ...input,
    lifeInsurance: { supportYears: 15, annualToCover: { amount: 30_000_000, currency: 'COP' } },
  };

  it('en modo compatible se usan los 10 años y el gasto anual de la plantilla', () => {
    const compatible = compute(custom, { mode: 'compatible' }).lifeInsurance;
    expect(compatible).toEqual(compute(input, { mode: 'compatible' }).lifeInsurance);
    expect(compatible.supportYears).toBe(10);
  });

  it('en modo nativo cuentan los datos del asesor', () => {
    const native = compute(custom, { mode: 'native' }).lifeInsurance;
    expect(native.supportYears).toBe(15);
    expect(native.annualToCover).toBe(30_000_000);
    expect(native.sumInsured).toBeCloseTo(
      Math.max(0, native.debts + 15 * 30_000_000 - native.liquidAndInvestments),
      6,
    );
  });
});

describe('condiciones de capacidad que fija el asesor', () => {
  const input = caseInput(c10);

  it('sin cambio, el ingreso variable se sugiere por el tipo de cliente (H-16)', () => {
    const suggested = { ...input, riskProfile: { ...input.riskProfile, variableIncome: null } };
    const result = compute(suggested, { mode: 'native' });
    expect(result.investment.profile.conditions.variableIncome).toBe(true);
    expect(result.investment.profile.finalLevel).toBe('conservador');
  });

  it('con el seguro de vida tomado, la condición de personas a cargo deja de cumplirse', () => {
    const insured = {
      ...input,
      insurances: input.insurances.map((row) =>
        row.isLife ? { ...row, status: 'si' as const } : row,
      ),
    };
    const result = compute(insured, { mode: 'native' });
    expect(result.investment.profile.conditions.dependentsWithoutLifeInsurance).toBe(false);
    expect(result.investment.profile.finalLevel).toBe('tolerante');
  });
});
