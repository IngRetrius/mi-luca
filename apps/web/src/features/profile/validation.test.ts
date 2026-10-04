import { describe, expect, it } from 'vitest';

import { parseProfile } from './validation';

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
  }
  return data;
}

const options = {
  today: '2026-10-01',
  availableThresholds: ['tax.dependent_income_limit'],
};

describe('parseProfile', () => {
  it('perfil y supuestos completos quedan listos para guardar', () => {
    const parsed = parseProfile(
      form({
        birthDate: '1974-03-15',
        sex: 'mujer',
        dependents: '2',
        clientType: 'contratista',
        cutoffDate: '2026-09-28',
        flowYear: '2027',
        mode: 'compatible',
        threshold: ['tax.dependent_income_limit', 'inventado'],
      }),
      options,
    );
    expect(parsed.ok && parsed.record).toEqual({
      client: {
        birth_date: '1974-03-15',
        sex: 'mujer',
        dependents_count: 2,
        client_type: 'contratista',
      },
      settings: {
        cutoff_date: '2026-09-28',
        flow_year: 2027,
        compatibility_mode: true,
        fiscal_threshold_keys: ['tax.dependent_income_limit'],
      },
    });
  });

  it('todo vacío es válido: sin datos, fecha de corte de hoy y modo nativo', () => {
    const parsed = parseProfile(form({}), options);
    expect(parsed.ok && parsed.record).toEqual({
      client: { birth_date: null, sex: null, dependents_count: 0, client_type: null },
      settings: {
        cutoff_date: null,
        flow_year: null,
        compatibility_mode: false,
        fiscal_threshold_keys: [],
      },
    });
  });

  it('valida fechas, personas a cargo y año', () => {
    const parsed = parseProfile(
      form({
        birthDate: '2027-01-01',
        dependents: '1.5',
        cutoffDate: '2026-02-30',
        flowYear: '27',
      }),
      options,
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      birthDate: 'futureBirthDate',
      dependents: 'invalidDependents',
      cutoffDate: 'invalidDate',
      flowYear: 'invalidYear',
    });
  });
});
