import { describe, expect, it } from 'vitest';

import { compute } from '../../src/compute';
import { qualityChecks, type QcCode } from '../../src/quality';
import { caseInput } from './adapters';
import { goldenCases } from './cases';

function failed(name: string, mode: 'compatible' | 'native' = 'compatible'): QcCode[] {
  const golden = goldenCases.find((entry) => entry.case === name)!;
  const input = caseInput(golden);
  const report = qualityChecks(input, compute(input, { mode }));
  return [...report.blocking, ...report.needNote, ...report.warnings].map((entry) => entry.code);
}

describe('qualityChecks con los casos de oro', () => {
  it('C1 (Colombia) solo tiene pendientes el perfil de riesgo y la prueba de realidad', () => {
    expect(failed('c1-colombia')).toEqual(['risk_profile_answered', 'reality_check_done']);
  });

  it('C10: perfil respondido y % dentro del rango; sin la edad no hay rango y bloquea', () => {
    const golden = goldenCases.find((entry) => entry.case === 'c10-inversion')!;
    const input = caseInput(golden);
    const codes = (report: ReturnType<typeof qualityChecks>) =>
      [...report.blocking, ...report.warnings].map((entry) => entry.code);
    expect(codes(qualityChecks(input, compute(input, { mode: 'compatible' })))).not.toContain(
      'growth_within_range',
    );
    const noAge = { ...input, profile: { ...input.profile, birthDate: null } };
    const report = qualityChecks(noAge, compute(noAge, { mode: 'compatible' }));
    expect(report.blocking.map((entry) => entry.code)).toEqual(['growth_within_range']);
  });

  it('C6: el sobrante no cuadra por el ingreso y la partida sin tipo (H-26)', () => {
    const codes = failed('c6-ingreso-variable');
    expect(codes).toContain('surplus_balances');
    expect(codes).toContain('complete_items');
    expect(codes).toContain('incomes_classified');
    // Tiene deuda cara y no invierte: ese control pasa.
    expect(codes).not.toContain('no_investment_with_expensive_debt');
  });

  it('C7: el año cierra en déficit y pide una nota', () => {
    const golden = goldenCases.find((entry) => entry.case === 'c7-metas-seguros')!;
    const input = caseInput(golden);
    const report = qualityChecks(input, compute(input, { mode: 'compatible' }));
    expect(report.needNote.map((entry) => entry.code)).toEqual(['no_income_covered']);
  });

  it('C8: los saldos superan lo disponible y la prueba de realidad pide revisar gastos', () => {
    const golden = goldenCases.find((entry) => entry.case === 'c8-saldos-cobros')!;
    const input = caseInput(golden);
    const report = qualityChecks(input, compute(input, { mode: 'compatible' }));
    expect(report.blocking.map((entry) => entry.code)).toEqual(['allocation_within_available']);
    expect(report.needNote.map((entry) => entry.code)).toEqual(['reality_check_confirms']);
  });

  it('cada control lleva sus cifras y el informe es determinista', () => {
    const golden = goldenCases.find((entry) => entry.case === 'c6-ingreso-variable')!;
    const input = caseInput(golden);
    const result = compute(input, { mode: 'compatible' });
    const report = qualityChecks(input, result);
    const surplus = report.items.find((entry) => entry.code === 'surplus_balances')!;
    // 84,5 - 69,94 - 4,8 millones = 9,76; el flujo da 9,16: la diferencia es lo que no entra.
    expect(surplus.detail.difference).toBeCloseTo(600_000, 2);
    expect(qualityChecks(input, result)).toEqual(report);
  });
});

describe('qualityChecks, controles que no dependen de la plantilla', () => {
  const golden = goldenCases.find((entry) => entry.case === 'c1-colombia')!;
  const input = caseInput(golden);

  it('una partida tipo bolsillo sin bolsillo bloquea y descuadra los aportes', () => {
    const items = input.budgetItems.map((entry) =>
      entry.expenseType === 'bolsillo' && entry.pocket === 'Viajes'
        ? { ...entry, pocket: null }
        : entry,
    );
    const changed = { ...input, budgetItems: items };
    const report = qualityChecks(changed, compute(changed, { mode: 'native' }));
    const codes = report.blocking.map((entry) => entry.code);
    expect(codes).toContain('items_have_pocket');
    expect(codes).toContain('pocket_contributions_match');
  });

  it('una moneda sin tasa bloquea la entrega (RN-017)', () => {
    const changed = {
      ...input,
      assets: [
        ...input.assets,
        { assetType: 'liquido' as const, value: { amount: 10, currency: 'EUR' } },
      ],
    };
    const report = qualityChecks(changed, compute(changed, { mode: 'native' }));
    const rates = report.blocking.find((entry) => entry.code === 'missing_rates');
    expect(rates?.detail.currencies).toEqual(['EUR']);
  });

  it('gastos pagados por otros y además un ingreso "otro": posible aporte contado dos veces', () => {
    const items = input.budgetItems.map((entry, index) =>
      index === 0 ? { ...entry, payer: 'familia' as const } : entry,
    );
    const incomes = [...input.incomes, { ...input.incomes[0]!, kind: 'otro' as const }];
    const changed = { ...input, budgetItems: items, incomes };
    const report = qualityChecks(changed, compute(changed, { mode: 'native' }));
    expect(report.warnings.map((entry) => entry.code)).toContain('third_party_counted_once');
  });
});
