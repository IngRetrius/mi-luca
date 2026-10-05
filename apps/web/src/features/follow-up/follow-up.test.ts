import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney, formatPercent, messages } from '@miluca/i18n';

import {
  CONTINUITY_FIELDS,
  continuitySheet,
  continuityText,
  decisionList,
  type ContinuityInput,
} from './continuity';
import { DECISIONS_MAX, parseNotes } from './notes';
import { nextReview, reviews, type ReviewTask } from './reviews';

const t = messages.es;
const labels = { owners: t.actionPlan.owners, clientTypes: t.profile.types };

const task = (overrides: Partial<ReviewTask>): ReviewTask => ({
  id: 'x',
  suggestion_key: null,
  due_date: null,
  status: 'pendiente',
  completed_at: null,
  ...overrides,
});

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('reviews', () => {
  const tasks = [
    task({ id: 'a', suggestion_key: 'review_30_days', due_date: '2026-10-01' }),
    task({ id: 'b', suggestion_key: 'review_90_days', due_date: '2026-12-31', status: 'en_curso' }),
    task({ id: 'c', suggestion_key: 'create_pockets', due_date: '2026-09-01' }),
  ];

  it('da el estado de cada revisión en la fecha dada', () => {
    expect(reviews(tasks, '2026-10-04').map(({ key, state }) => [key, state])).toEqual([
      ['review_30_days', 'vencida'],
      ['review_90_days', 'programada'],
      ['annual_review', 'sin_programar'],
    ]);
    const done = reviews(
      [task({ suggestion_key: 'annual_review', status: 'hecho' })],
      '2026-10-04',
    );
    expect(done[2]?.state).toBe('hecha');
  });

  it('la próxima es la revisión pendiente más temprana, aunque esté vencida', () => {
    expect(nextReview(tasks)?.id).toBe('a');
    expect(nextReview([{ ...tasks[0]!, status: 'hecho' }, tasks[1]!, tasks[2]!])?.id).toBe('b');
    // Las demás tareas del plan de acción no son revisiones.
    expect(nextReview([tasks[2]!])).toBeNull();
  });
});

describe('parseNotes', () => {
  it('lee las respuestas y normaliza las decisiones', () => {
    const parsed = parseNotes(
      form({ hasWill: 'si', beneficiariesReviewed: 'otra', decisions: '  - Uno\r\nDos\r\n' }),
    );
    expect(parsed).toEqual({
      ok: true,
      values: { hasWill: 'si', beneficiariesReviewed: 'sin_dato', decisions: '- Uno\nDos' },
      record: { has_will: true, beneficiaries_reviewed: null, decisions: '- Uno\nDos' },
    });
    expect(parseNotes(form({ hasWill: 'no' })).ok && parseNotes(form({ hasWill: 'no' }))).toEqual(
      expect.objectContaining({ record: expect.objectContaining({ has_will: false }) }),
    );
  });

  it('cuenta caracteres como la base, no unidades de UTF-16', () => {
    expect(parseNotes(form({ decisions: 'ñ'.repeat(DECISIONS_MAX) })).ok).toBe(true);
    expect(parseNotes(form({ decisions: '😀'.repeat(DECISIONS_MAX) })).ok).toBe(true);
    const long = parseNotes(form({ decisions: 'a'.repeat(DECISIONS_MAX + 1) }));
    expect(!long.ok && long.errors).toEqual({ decisions: 'tooLong' });
  });
});

describe('decisionList', () => {
  it('quita viñetas y líneas vacías', () => {
    expect(
      decisionList('- Primero el fondo\n\n• Luego la inversión\n  * Revisar en marzo  '),
    ).toEqual(['Primero el fondo', 'Luego la inversión', 'Revisar en marzo']);
  });
});

// Caso inventado: no viene de ningún cliente.
const input: ContinuityInput = {
  clientName: 'Cliente Prueba',
  countryName: 'Colombia',
  date: '2026-10-04',
  locale: 'es-CO',
  currency: 'COP',
  age: 45,
  clientType: 'contratista',
  dependents: 2,
  incomes: [
    { name: 'Honorarios', amount: { amount: 4_000_000, currency: 'COP' }, paymentsPerYear: 11 },
    { name: 'Consultoría', amount: { amount: 500, currency: 'USD' }, paymentsPerYear: 1 },
  ],
  monthlyExpenses: 2_500_000,
  essentialMonthly: 1_800_000,
  programmedSavings: 1_200_000,
  annualSurplus: 9_000_000,
  realityCheck: 'pendiente',
  debts: {
    count: 2,
    total: 12_000_000,
    expensive: 3_000_000,
    payoff: { date: '2027-06-01', exceedsHorizon: false },
  },
  emergency: { goal: 15_000_000, balance: 5_000_000, completionMonth: '2027-09-01' },
  pockets: [{ name: 'Viajes', monthly: 300_000 }],
  risk: { willingness: 'moderado', capacity: 'conservador', final: 'conservador' },
  investment: {
    balance: 8_000_000,
    monthly: 400_000,
    growthShare: 0.45,
    currentGrowth: 2_000_000,
    currentStability: 6_000_000,
    horizon: 'mas_7',
  },
  insurance: { current: ['Vehículo (todo riesgo)'], quoting: [] },
  succession: { hasWill: false, beneficiariesReviewed: null },
  assumptions: {
    fxRates: [{ currency: 'USD', rate: 3_900 }],
    minimumWage: { amount: 1_750_905, currency: 'COP' },
    pctToInvestment: 0.5,
  },
  decisions: 'Primero el fondo de emergencia\nLuego la deuda cara',
  pending: [
    { title: 'Crear los bolsillos', owner: 'cliente', dueDate: '2026-10-11' },
    { title: 'Revisión anual del plan', owner: 'asesor', dueDate: null },
  ],
  lastDelivery: { label: 'Plan inicial', deliveredOn: '2026-10-02' },
  nextReview: '2026-11-03',
};

describe('continuitySheet', () => {
  const sheet = continuitySheet(input, t.followUp.sheet, labels);
  const value = (field: string) => sheet.lines.find((line) => line.field === field)?.value;
  const money = (amount: number, currency = 'COP') => formatMoney(amount, currency, 'es-CO');
  const date = (day: string) => formatDate(day, 'es-CO', 'UTC');
  const pct = (ratio: number) => formatPercent(ratio, 'es-CO', 0);

  it('tiene todos los campos del Anexo C, en su orden', () => {
    expect(sheet.lines.map((line) => line.label)).toEqual([
      'Perfil',
      'Ingresos',
      'Gasto mensual promedio',
      'Ahorro programado',
      'Sobrante anual',
      'Deudas',
      'Fondo de emergencia',
      'Bolsillos',
      'Perfil de riesgo',
      'Inversión',
      'Pensión',
      'Seguros',
      'Sucesión',
      'Supuestos clave',
      'Decisiones tomadas',
      'Pendientes',
      'Archivos',
      'Próxima revisión',
    ]);
    expect(sheet.lines.map((line) => line.field)).toEqual(CONTINUITY_FIELDS);
    expect(sheet.heading).toBe(`FICHA DE CONTINUIDAD - Cliente Prueba - ${date('2026-10-04')}`);
  });

  it('escribe cada campo con los datos del caso', () => {
    expect(value('profile')).toBe('45 años · Contratista · Colombia · 2 personas a cargo');
    expect(value('incomes')).toEqual([
      `Honorarios: ${money(4_000_000)}, 11 pagos al año`,
      `Consultoría: ${money(500, 'USD')}, 1 pago al año`,
    ]);
    expect(value('programmedSavings')).toBe(
      `${money(1_200_000)} al año (${money(100_000)} al mes)`,
    );
    expect(value('surplus')).toBe(`${money(9_000_000)} · prueba de realidad pendiente`);
    expect(value('debts')).toBe(
      `saldo total ${money(12_000_000)} · deuda cara ${money(3_000_000)} · salida estimada en junio de 2027`,
    );
    expect(value('emergencyFund')).toBe(
      `meta ${money(15_000_000)} · saldo actual ${money(5_000_000)} · se completa con el sobrante en septiembre de 2027`,
    );
    expect(value('riskProfile')).toBe(
      'disposición moderado · capacidad conservador · perfil final conservador',
    );
    expect(value('investment')).toContain(
      `${pct(0.45)} en crecimiento y ${pct(0.55)} en estabilidad`,
    );
    expect(value('investment')).toContain('plazo de uso: más de 7 años');
    expect(value('pension')).toBe(t.followUp.sheet.values.pension);
    expect(value('insurance')).toBe('vigentes: Vehículo (todo riesgo) · en cotización: ninguno');
    expect(value('succession')).toBe('testamento: no · beneficiarios revisados: sin dato');
    expect(value('assumptions')).toBe(
      `tasa de cambio 1 USD = ${money(3_900)} · salario mínimo ${money(1_750_905)} · ${pct(0.5)} del sobrante a inversión`,
    );
    expect(value('decisions')).toEqual(['Primero el fondo de emergencia', 'Luego la deuda cara']);
    expect(value('pending')).toEqual([
      `Crear los bolsillos (Cliente, antes del ${date('2026-10-11')})`,
      'Revisión anual del plan (Asesor, sin fecha límite)',
    ]);
    expect(value('files')).toBe(`último plan entregado: Plan inicial, del ${date('2026-10-02')}`);
    expect(value('nextReview')).toBe(date('2026-11-03'));
  });

  it('dice lo que falta en vez de dejar campos vacíos', () => {
    const empty = continuitySheet(
      {
        ...input,
        age: null,
        clientType: null,
        dependents: 0,
        incomes: [],
        debts: { count: 0, total: 0, expensive: 0, payoff: null },
        emergency: { goal: 0, balance: 0, completionMonth: null },
        pockets: [],
        risk: { willingness: null, capacity: 'no_invertir', final: null },
        investment: { ...input.investment, horizon: null },
        insurance: { current: [], quoting: [] },
        assumptions: { fxRates: [], minimumWage: null, pctToInvestment: 0.5 },
        decisions: '  \n',
        pending: [],
        lastDelivery: null,
        nextReview: null,
      },
      t.followUp.sheet,
      labels,
    );
    const emptyValue = (field: string) => empty.lines.find((line) => line.field === field)?.value;
    expect(emptyValue('profile')).toBe(
      'edad sin dato · Sin definir · Colombia · sin personas a cargo',
    );
    expect(emptyValue('incomes')).toBe('Sin ingresos registrados');
    expect(emptyValue('debts')).toBe('Sin deudas');
    expect(emptyValue('pockets')).toBe('Sin bolsillos con aporte');
    expect(emptyValue('riskProfile')).toBe(
      'disposición sin responder · capacidad no invertir todavía · perfil final sin responder',
    );
    expect(emptyValue('assumptions')).toBe(
      `tasa de cambio sin otras monedas que COP · ${pct(0.5)} del sobrante a inversión`,
    );
    expect(emptyValue('decisions')).toBe('Ninguna anotada');
    expect(emptyValue('pending')).toBe('Ninguno');
    expect(emptyValue('files')).toBe('Sin plan entregado');
    expect(emptyValue('nextReview')).toBe('Sin programar');
  });

  it('deudas sin deuda cara o que pasan del horizonte', () => {
    const noExpensive = continuitySheet(
      { ...input, debts: { count: 1, total: 1_000_000, expensive: 0, payoff: null } },
      t.followUp.sheet,
      labels,
    );
    expect(noExpensive.lines.find((line) => line.field === 'debts')?.value).toBe(
      `saldo total ${money(1_000_000)} · sin deuda cara`,
    );
    const beyond = continuitySheet(
      { ...input, debts: { ...input.debts, payoff: { date: null, exceedsHorizon: true } } },
      t.followUp.sheet,
      labels,
    );
    expect(beyond.lines.find((line) => line.field === 'debts')?.value).toContain(
      'salida en más de 120 meses',
    );
  });

  it('el texto para copiar sigue el bloque del protocolo', () => {
    const text = continuityText(sheet).split('\n');
    expect(text[0]).toBe(sheet.heading);
    expect(text[1]).toBe('Perfil: 45 años · Contratista · Colombia · 2 personas a cargo');
    const decisions = text.indexOf('Decisiones tomadas:');
    expect(text.slice(decisions + 1, decisions + 3)).toEqual([
      '- Primero el fondo de emergencia',
      '- Luego la deuda cara',
    ]);
    expect(text.at(-1)).toBe(`Próxima revisión: ${date('2026-11-03')}`);
  });
});
