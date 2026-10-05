import { actionOwnerSchema, type IsoDate, type Money } from '@miluca/domain';
import { messages } from '@miluca/i18n';

import type { ActionItemRow } from '@/features/action-plan';
import type { ComputedCase } from '@/features/summary';
import { todayIn } from '@/lib/dates';

import type { ContinuityInput } from './continuity';
import type { ContinuityNotes } from './notes';

const t = messages.es;

/**
 * Saca del caso calculado lo que lleva la ficha de continuidad. Las cifras son las del motor con
 * los datos de hoy; los nombres, los de las filas del cliente.
 */
export function continuityInput({
  computed,
  client,
  notes,
  tasks,
  lastDelivery,
  nextReview,
  minimumWage,
  today,
  locale,
}: {
  computed: Pick<ComputedCase, 'input' | 'result' | 'figures' | 'rows'>;
  client: { readonly displayName: string; readonly countryName: string };
  notes: ContinuityNotes;
  tasks: readonly ActionItemRow[];
  lastDelivery: { readonly label: string; readonly deliveredAt: string } | null;
  nextReview: IsoDate | null;
  minimumWage: Money | null;
  /** Hoy en el país del cliente: el día de la ficha. */
  today: IsoDate;
  locale: string;
}): ContinuityInput {
  const { input, result, figures, rows } = computed;
  const country = rows.client.country_code;
  const { pockets, summary, investment } = result;
  // Con el plan secuencial (modo nativo) el fondo se llena con el sobrante, no con un aporte fijo:
  // su línea dice cuándo se completa y no va entre los bolsillos con aporte.
  const plan = result.savingsPlan;
  const pocketName = new Map(rows.pockets.map((pocket) => [pocket.id, pocket.name]));
  const pocketRows = [
    ...(plan ? [] : [{ name: t.plan.emergency, monthly: pockets.emergency.monthlyContribution }]),
    { name: t.plan.noIncome, monthly: pockets.noIncome.monthlyContribution },
    ...pockets.general.map((row, index) => ({
      name: pocketName.get(input.pockets[index]?.key ?? '') || t.pockets.unnamed,
      monthly: row.monthlyContribution,
    })),
  ].filter((row) => row.monthly > 0);
  const insuranceName = (row: (typeof rows.insurances)[number]) =>
    row.custom_name ||
    t.insurance.types[row.insurance_type as keyof typeof t.insurance.types] ||
    row.insurance_type;

  return {
    clientName: client.displayName,
    countryName: client.countryName,
    date: today,
    locale,
    currency: rows.client.base_currency,
    age: investment.age,
    clientType: input.profile.clientType,
    dependents: input.profile.dependents,
    incomes: rows.incomes.map((income, index) => ({
      name: income.name,
      amount: { amount: income.amount, currency: income.currency },
      paymentsPerYear: result.incomes.rows[index]?.paymentsPerYear ?? 0,
    })),
    monthlyExpenses: figures.monthlyExpenses ?? 0,
    essentialMonthly: figures.essentialMonthly ?? 0,
    programmedSavings: summary.programmedSavings,
    annualSurplus: summary.annualSurplus,
    realityCheck: result.realityCheck.status,
    debts: {
      count: rows.debts.length,
      total: summary.totalDebt,
      expensive: result.expensiveDebt.balance,
      payoff: summary.expensiveDebtPayoff,
    },
    emergency: {
      goal: result.emergencyFund.currentGoal,
      balance: pockets.emergency.balance,
      completionMonth: plan?.completionMonth ?? null,
    },
    pockets: pocketRows,
    risk: {
      willingness: investment.profile.willingnessLevel,
      capacity: investment.profile.capacityLevel,
      final: investment.profile.finalLevel,
    },
    investment: {
      balance: investment.current.total,
      monthly: investment.plan.monthly.total,
      growthShare: investment.allocation.growthShare,
      currentGrowth: investment.current.growth,
      currentStability: investment.current.stability,
      horizon: input.riskProfile.answers.horizon,
    },
    insurance: {
      current: rows.insurances.filter((row) => row.status === 'si').map(insuranceName),
      quoting: rows.insurances.filter((row) => row.status === 'cotizando').map(insuranceName),
    },
    succession: { hasWill: notes.hasWill, beneficiariesReviewed: notes.beneficiariesReviewed },
    assumptions: {
      fxRates: rows.fxRates.map((rate) => ({ currency: rate.currency, rate: rate.rate_to_base })),
      minimumWage,
      pctToInvestment: result.realityCheck.pctToInvestment,
    },
    decisions: notes.decisions,
    pending: tasks
      .filter((task) => task.status !== 'hecho')
      .map((task) => ({
        title: task.title,
        owner: actionOwnerSchema.catch('asesor').parse(task.owner_role),
        dueDate: task.due_date,
      })),
    lastDelivery: lastDelivery
      ? {
          label: lastDelivery.label,
          deliveredOn: todayIn(country, new Date(lastDelivery.deliveredAt)),
        }
      : null,
    nextReview,
  };
}
