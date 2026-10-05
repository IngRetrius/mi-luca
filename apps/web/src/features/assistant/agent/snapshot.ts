import type { LoadedCaseRows } from '@/features/summary';

/** Lo que el agente necesita ver del caso: sin nombre del cliente ni datos de contacto. */
export type SnapshotRows = Pick<
  LoadedCaseRows,
  | 'client'
  | 'settings'
  | 'fxRates'
  | 'incomes'
  | 'budgetItems'
  | 'banks'
  | 'pockets'
  | 'debts'
  | 'goals'
  | 'insurances'
  | 'assets'
  | 'investments'
  | 'receivables'
  | 'riskProfile'
  | 'realityCheck'
>;

function value(amount: number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined) return '-';
  return currency ? `${amount} ${currency}` : String(amount);
}

function line(...parts: readonly (string | number | null | undefined | false)[]): string {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== false && part !== '')
    .join(' | ');
}

function section(title: string, rows: readonly string[]): string {
  return rows.length === 0
    ? `${title}: ninguno`
    : `${title}:\n${rows.map((row) => `- ${row}`).join('\n')}`;
}

/**
 * El estado del caso en texto compacto, una línea por registro con su id, para que el agente
 * corrija en lugar de duplicar. Va dentro del mensaje del asesor (como dato, no como instrucción).
 * Los textos son los que escribieron el asesor o el cliente; el nombre del cliente no va.
 */
export function caseSnapshot(rows: SnapshotRows, today: string): string {
  const { client, settings } = rows;
  const pockets = rows.pockets.filter((pocket) => pocket.kind === 'general');
  const risk = rows.riskProfile;
  const reality = rows.realityCheck;
  return [
    line(
      `Hoy: ${today}`,
      `país: ${client.country_code}`,
      `moneda base: ${client.base_currency}`,
      `fecha de corte: ${settings?.cutoff_date ?? today}`,
    ),
    line(
      'Perfil',
      `nacimiento: ${client.birth_date ?? '-'}`,
      `sexo: ${client.sex ?? '-'}`,
      `personas a cargo: ${client.dependents_count}`,
      `tipo de cliente: ${client.client_type ?? '-'}`,
    ),
    section(
      'Monedas con tasa (unidades de moneda base por 1)',
      rows.fxRates.map((rate) =>
        line(rate.currency, String(rate.rate_to_base), `fecha ${rate.as_of}`),
      ),
    ),
    section(
      'Bancos',
      rows.banks.map((bank) => line(`id ${bank.id}`, bank.name)),
    ),
    section(
      'Bolsillos generales',
      pockets.map((pocket) => line(`id ${pocket.id}`, pocket.name, pocket.purpose)),
    ),
    section(
      'Ingresos (valor por pago)',
      rows.incomes.map((income) =>
        line(
          `id ${income.id}`,
          income.name,
          income.kind,
          value(income.amount, income.currency),
          `pagos por mes ${income.payments_by_month.join(',')}`,
          income.is_net ? 'neto' : 'bruto',
        ),
      ),
    ),
    section(
      'Gastos (valor por pago)',
      rows.budgetItems.map((item) =>
        line(
          `id ${item.id}`,
          `${item.category} / ${item.concept}`,
          value(item.amount, item.currency),
          item.frequency,
          item.duration_days ? `${item.duration_days} días` : null,
          item.expense_type,
          item.essential ? 'esencial' : null,
          item.payer === 'cliente' ? null : `paga ${item.payer}`,
          item.pocket_id ? `bolsillo ${item.pocket_id}` : null,
          item.scope === 'referencia_familiar' ? 'referencia familiar (no suma)' : null,
        ),
      ),
    ),
    section(
      'Deudas',
      rows.debts.map((debt) =>
        line(
          `id ${debt.id}`,
          debt.name,
          debt.debt_type,
          debt.lender_name,
          `saldo ${value(debt.balance, debt.currency)}`,
          `tasa ${Math.round(debt.annual_rate * 1_000_000) / 10_000} % EA`,
          `cuota ${value(debt.min_payment, debt.currency)}`,
          debt.accepts_extra ? null : 'no acepta abonos',
        ),
      ),
    ),
    section(
      'Metas',
      rows.goals.map((goal) =>
        line(
          `id ${goal.id}`,
          goal.name,
          value(goal.amount, goal.currency),
          goal.target_date ? `para ${goal.target_date}` : null,
          goal.repeat_every_years ? `cada ${goal.repeat_every_years} años` : null,
          goal.already_saved ? `ahorrado ${value(goal.already_saved, goal.currency)}` : null,
          goal.uses_trip_calculator ? 'con calculadora de viaje' : null,
          goal.pocket_id ? `bolsillo ${goal.pocket_id}` : null,
        ),
      ),
    ),
    section(
      'Seguros',
      rows.insurances.map((insurance) =>
        line(
          `id ${insurance.id}`,
          insurance.insurance_type,
          insurance.custom_name,
          insurance.status ?? 'sin responder',
          insurance.annual_premium_quoted === null
            ? null
            : `prima anual ${value(insurance.annual_premium_quoted, insurance.currency)}`,
        ),
      ),
    ),
    section(
      'Activos',
      rows.assets.map((asset) =>
        line(`id ${asset.id}`, asset.name, asset.asset_type, value(asset.value, asset.currency)),
      ),
    ),
    section(
      'Inversiones',
      rows.investments.map((investment) =>
        line(
          `id ${investment.id}`,
          investment.name,
          investment.bucket ?? 'sin tramo',
          value(investment.balance, investment.currency),
        ),
      ),
    ),
    section(
      'Cobros (le deben)',
      rows.receivables.map((receivable) =>
        line(
          `id ${receivable.id}`,
          receivable.debtor_label,
          `saldo al empezar a pagar ${value(receivable.balance, receivable.currency)}`,
          `cuota ${value(receivable.monthly_payment, receivable.currency)}`,
          receivable.first_payment_date ? `primer pago ${receivable.first_payment_date}` : null,
        ),
      ),
    ),
    line(
      'Perfil de riesgo',
      `caída de 15 %: ${risk?.drop_reaction ?? '-'}`,
      `experiencia: ${risk?.experience ?? '-'}`,
      `plazo: ${risk?.horizon ?? '-'}`,
    ),
    line(
      'Prueba de realidad',
      reality
        ? `hace ${reality.n_months ?? '-'} meses ${value(reality.savings_n_ago, reality.currency)}; hoy ${value(reality.savings_today, reality.currency)}`
        : 'sin datos',
    ),
  ].join('\n');
}
