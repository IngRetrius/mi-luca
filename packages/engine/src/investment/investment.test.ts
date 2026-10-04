import type { MoneyHorizon } from '@miluca/domain';
import { describe, expect, it } from 'vitest';

import { DEFAULT_GROWTH_RANGES, growthAllocation } from './growth-allocation';
import { projection } from './projection';
import { riskProfile, type RiskCapacityInput } from './risk-profile';

const none: RiskCapacityInput = {
  variableIncome: false,
  dependentsWithoutLifeInsurance: false,
  pensionGap: false,
  emergencyFundIncomplete: false,
  nearRetirementWithoutPension: false,
};

describe('riskProfile', () => {
  it('la disposición sale de los puntos: 3 o menos, 4 o 5, 6', () => {
    const level = (
      dropReaction: 'venderia' | 'invertiria_mas',
      experience: 'ninguna' | 'algo' | 'bastante',
    ) => riskProfile({ dropReaction, experience, horizon: null }, none, false).willingness;
    expect(level('venderia', 'algo')).toBe(1);
    expect(level('invertiria_mas', 'ninguna')).toBe(2);
    expect(level('invertiria_mas', 'algo')).toBe(2);
    expect(level('invertiria_mas', 'bastante')).toBe(3);
  });

  it('la capacidad baja con cada condición, con mínimo conservador, y es 0 con 4 o con deuda cara', () => {
    const answers = {
      dropReaction: 'invertiria_mas',
      experience: 'bastante',
      horizon: null,
    } as const;
    const capacity = (count: number, expensive = false) => {
      const keys = Object.keys(none) as (keyof RiskCapacityInput)[];
      const conditions = Object.fromEntries(keys.map((key, i) => [key, i < count]));
      return riskProfile(answers, conditions as unknown as RiskCapacityInput, expensive);
    };
    expect([0, 1, 2, 3, 4, 5].map((count) => capacity(count).capacity)).toEqual([3, 2, 1, 1, 0, 0]);
    expect(capacity(0, true).capacity).toBe(0);
    expect(capacity(0, true).finalLevel).toBe('no_invertir');
    expect(capacity(1).finalLevel).toBe('moderado');
  });

  it('sin una respuesta no hay perfil final', () => {
    const profile = riskProfile(
      { dropReaction: 'venderia', experience: null, horizon: null },
      none,
      false,
    );
    expect(profile.willingness).toBeNull();
    expect(profile.final).toBeNull();
    expect(profile.capacityLevel).toBe('tolerante');
  });
});

describe('growthAllocation', () => {
  const base = { rangePosition: 0.5, ranges: DEFAULT_GROWTH_RANGES } as const;
  const horizons: (MoneyHorizon | null)[] = [null, 'menos_3', 'de_3_a_7', 'mas_7'];

  it('el % en crecimiento siempre queda dentro del rango, y en 0 a menos de 3 años', () => {
    for (const age of [18, 34, 35, 49, 50, 59, 60, 90]) {
      for (const finalProfile of [null, 0, 1, 2, 3]) {
        for (const horizon of horizons) {
          for (const rangePosition of [0, 0.3, 1]) {
            const result = growthAllocation({ ...base, age, finalProfile, horizon, rangePosition });
            if (horizon === 'menos_3' || !finalProfile) {
              expect(result.growthShare).toBe(0);
            } else {
              expect(result.growthShare).toBeGreaterThanOrEqual(result.rangeMin);
              expect(result.growthShare).toBeLessThanOrEqual(result.rangeMax);
            }
            expect(result.growthShare + result.stabilityShare).toBeCloseTo(1, 12);
          }
        }
      }
    }
  });

  it('elige el tramo por la edad y explica por qué no hay crecimiento', () => {
    expect(growthAllocation({ ...base, age: 35, finalProfile: 2, horizon: 'mas_7' })).toMatchObject(
      {
        band: 1,
        rangeMin: 0.5,
        rangeMax: 0.65,
        note: null,
      },
    );
    expect(growthAllocation({ ...base, age: 40, finalProfile: 0, horizon: 'mas_7' }).note).toBe(
      'stability_first',
    );
    expect(growthAllocation({ ...base, age: 40, finalProfile: 3, horizon: 'menos_3' }).note).toBe(
      'short_horizon',
    );
    expect(
      growthAllocation({ ...base, age: null, finalProfile: null, horizon: null }),
    ).toMatchObject({
      band: null,
      note: 'answer_profile',
    });
  });
});

describe('projection', () => {
  const parameters = {
    realReturnGrowth: 0.05,
    realReturnStability: 0.015,
    glideStep: 0.02,
    growthFloor: 0.1,
  };
  const input = {
    firstYear: 2027,
    birthYear: 1990,
    yearsToRetirement: 30,
    growthShare: 0.6,
    startingBalance: 1000,
    annualContribution: 100,
    receivablesByYear: [],
    parameters,
  };

  it('lejos del retiro el % no baja; los aportes del año rinden medio año', () => {
    const [first] = projection(input);
    expect(first).toMatchObject({ year: 2027, ageAtClose: 37, growthShare: 0.6 });
    expect(first!.returnAmount).toBeCloseTo((1000 + 50) * (0.6 * 0.05 + 0.4 * 0.015), 10);
  });

  it('en los 10 años antes del retiro baja hasta el piso, salvo que el % de hoy ya sea menor', () => {
    const near = projection({ ...input, yearsToRetirement: 3 }).map((row) => row.growthShare);
    expect(near.slice(0, 5).map((value) => Number(value.toFixed(4)))).toEqual([
      0.6, 0.58, 0.56, 0.54, 0.54,
    ]);
    const low = projection({ ...input, yearsToRetirement: 3, growthShare: 0.05 });
    expect(low.every((row) => row.growthShare === 0.05)).toBe(true);
    expect(projection({ ...input, growthShare: 0 }).every((row) => row.growthShare === 0)).toBe(
      true,
    );
  });
});
