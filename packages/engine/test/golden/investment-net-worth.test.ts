import type { RiskLevel } from '@miluca/domain';
import { describe, expect, it } from 'vitest';

import { compute } from '../../src/compute';
import type { GrowthAllocationNote } from '../../src/investment';
import { NET_WORTH_GROUPS } from '../../src/net-worth';
import { caseInput, INVESTMENT_ROWS, investmentsInput } from './adapters';
import { cell, goldenCases } from './cases';
import { expectCell } from './expect-cell';

// Tolerancia de razones (04-motor, 7.1).
const RATIO_TOLERANCE = 0.000001;

/** @excel Inversión!E20, E31, E32 */
const LEVEL_LABELS: Readonly<Record<RiskLevel, string>> = {
  no_invertir: 'No invertir todavía',
  conservador: 'Conservador',
  moderado: 'Moderado',
  tolerante: 'Tolerante',
};

/** @excel Inversión!B47 */
const NOTE_LABELS: Readonly<Record<GrowthAllocationNote, string>> = {
  short_horizon: 'El dinero se necesitaría en menos de 3 años: todo va a estabilidad.',
  stability_first:
    'Primero estabilidad: pagar la deuda cara o fortalecer la capacidad antes de invertir en crecimiento.',
  answer_profile: 'Responde las preguntas de disposición para calcular el perfil.',
};

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

describe.each(goldenCases)('caso de oro $case: Inversión, Patrimonio y vida', (golden) => {
  const input = caseInput(golden);
  const result = compute(input, { mode: 'compatible' });
  const { investment, netWorth } = result;

  const expectRatio = (ref: string, actual: number) => {
    const expected = cell(golden, ref);
    if (typeof expected !== 'number') throw new Error(`${ref} no es numérica: ${String(expected)}`);
    expect(
      Math.abs(actual - expected),
      `${ref}: motor ${actual}, Excel ${expected}`,
    ).toBeLessThanOrEqual(RATIO_TOLERANCE);
  };
  const expectText = (ref: string, actual: string) => {
    const expected = cell(golden, ref);
    expect(actual, ref).toBe(expected === undefined || expected === null ? '' : expected);
  };

  it('reproduce las inversiones actuales (F6:F14)', () => {
    let next = 0;
    const withBalance = new Set(
      INVESTMENT_ROWS.filter((row) => typeof cell(golden, `Inversión!E${row}`) === 'number'),
    );
    expect(investmentsInput(golden)).toHaveLength(withBalance.size);
    for (const row of INVESTMENT_ROWS) {
      const value = withBalance.has(row) ? investment.current.rows[next++]! : 0;
      expectCell(golden, `Inversión!F${row}`, value);
    }
    expectCell(golden, 'Inversión!F12', investment.current.total);
    expectCell(golden, 'Inversión!F13', investment.current.growth);
    expectCell(golden, 'Inversión!F14', investment.current.stability);
  });

  it('reproduce disposición, capacidad y perfil final (D18:E32)', () => {
    const { profile } = investment;
    expectCell(golden, 'Inversión!D18', profile.dropPoints);
    expectCell(golden, 'Inversión!D19', profile.experiencePoints);
    expectCell(golden, 'Inversión!D20', profile.willingness);
    expectText(
      'Inversión!E20',
      profile.willingnessLevel === null
        ? 'Falta responder'
        : LEVEL_LABELS[profile.willingnessLevel],
    );
    expectText('Inversión!C25', yesNo(profile.conditions.variableIncome));
    expectText('Inversión!C26', yesNo(profile.conditions.dependentsWithoutLifeInsurance));
    expectText('Inversión!C27', yesNo(profile.conditions.pensionGap));
    expectText('Inversión!C28', yesNo(profile.conditions.emergencyFundIncomplete));
    expectText('Inversión!C29', yesNo(profile.conditions.nearRetirementWithoutPension));
    expectCell(golden, 'Inversión!C30', profile.conditionsMet);
    expectCell(golden, 'Inversión!D31', profile.capacity);
    expectText('Inversión!E31', LEVEL_LABELS[profile.capacityLevel]);
    expectCell(golden, 'Inversión!D32', profile.final);
    expectText(
      'Inversión!E32',
      profile.finalLevel === null ? 'Falta responder' : LEVEL_LABELS[profile.finalLevel],
    );
  });

  it('reproduce tramo, rango y % en crecimiento (C41:C47)', () => {
    const { allocation } = investment;
    // MATCH de Excel cuenta desde 1.
    expectCell(golden, 'Inversión!C41', allocation.band === null ? null : allocation.band + 1);
    expectRatio('Inversión!C42', allocation.rangeMin);
    expectRatio('Inversión!C43', allocation.rangeMax);
    expectRatio('Inversión!C45', allocation.growthShare);
    expectRatio('Inversión!C46', allocation.stabilityShare);
    expectText('Inversión!B47', allocation.note === null ? '' : NOTE_LABELS[allocation.note]);
  });

  it('reproduce la distribución y el movimiento sugerido (C51:E56)', () => {
    const { plan } = investment;
    const rows = [
      [51, plan.monthly],
      [52, plan.annual],
      [53, plan.lumpSum],
      [54, plan.current],
      [55, plan.target],
    ] as const;
    for (const [row, values] of rows) {
      expectCell(golden, `Inversión!C${row}`, values.total);
      expectCell(golden, `Inversión!D${row}`, values.growth);
      expectCell(golden, `Inversión!E${row}`, values.stability);
    }
    expectCell(golden, 'Inversión!D56', plan.movement.growth);
    expectCell(golden, 'Inversión!E56', plan.movement.stability);
  });

  it('reproduce la proyección ilustrativa de 10 años (B61:J71)', () => {
    expectCell(golden, 'Inversión!C71', investment.yearsToRetirement);
    investment.projection.forEach((year, k) => {
      const row = 61 + k;
      expectCell(golden, `Inversión!B${row}`, year.year);
      expectCell(golden, `Inversión!C${row}`, year.ageAtClose);
      expectRatio(`Inversión!D${row}`, year.growthShare);
      expectRatio(`Inversión!E${row}`, year.blendedReturn);
      expectCell(golden, `Inversión!F${row}`, year.startBalance);
      expectCell(golden, `Inversión!G${row}`, year.contribution);
      expectCell(golden, `Inversión!H${row}`, year.receivables);
      expectCell(golden, `Inversión!I${row}`, year.returnAmount);
      expectCell(golden, `Inversión!J${row}`, year.endBalance);
    });
  });

  it('reproduce el patrimonio y su composición (F6:F30, C33:D39)', () => {
    expectCell(golden, 'Patrimonio!F6', netWorth.composition.inversion.value);
    expectCell(golden, 'Patrimonio!F7', netWorth.composition.por_cobrar.value);
    expectCell(golden, 'Patrimonio!F28', netWorth.totalAssets);
    expectCell(golden, 'Patrimonio!F29', netWorth.debts);
    expectCell(golden, 'Patrimonio!F30', netWorth.netWorth);
    NET_WORTH_GROUPS.forEach((group, index) => {
      expectCell(golden, `Patrimonio!C${33 + index}`, netWorth.composition[group].value);
      expectRatio(`Patrimonio!D${33 + index}`, netWorth.composition[group].share);
    });
    expectRatio('Patrimonio!C39', netWorth.concentration);
  });

  it('reproduce la suma asegurada orientativa de vida (Seguros!C20:C24)', () => {
    const life = result.lifeInsurance;
    expectCell(golden, 'Seguros!C20', life.debts);
    expectCell(golden, 'Seguros!C21', life.annualToCover);
    expectCell(golden, 'Seguros!C22', life.supportYears);
    expectCell(golden, 'Seguros!C23', life.liquidAndInvestments);
    expectCell(golden, 'Seguros!C24', life.sumInsured);
  });

  it('reproduce perfil, % en crecimiento, patrimonio y concentración del Resumen (C27, C28, C33, C34)', () => {
    const { summary } = result;
    expectText(
      'Resumen!C27',
      summary.riskProfile === null ? 'Falta responder' : LEVEL_LABELS[summary.riskProfile],
    );
    expectRatio('Resumen!C28', summary.growthShare);
    expectCell(golden, 'Resumen!C33', summary.netWorth);
    expectRatio('Resumen!C34', summary.concentration);
  });
});
