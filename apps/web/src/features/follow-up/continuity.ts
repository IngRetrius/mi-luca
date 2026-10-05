import type {
  ActionOwner,
  ClientType,
  IsoDate,
  Money,
  MoneyHorizon,
  RiskLevel,
} from '@miluca/domain';
import type { ExpensiveDebtPayoff, RealityCheckStatus } from '@miluca/engine';
import { formatDate, formatMoney, formatPercent, type Messages } from '@miluca/i18n';

/** Campos del Anexo C del protocolo, en su orden. */
export const CONTINUITY_FIELDS = [
  'profile',
  'incomes',
  'spending',
  'programmedSavings',
  'surplus',
  'debts',
  'emergencyFund',
  'pockets',
  'riskProfile',
  'investment',
  'pension',
  'insurance',
  'succession',
  'assumptions',
  'decisions',
  'pending',
  'files',
  'nextReview',
] as const;

export type ContinuityField = (typeof CONTINUITY_FIELDS)[number];

/**
 * Lo que lleva la ficha, ya sacado del caso calculado: importes en moneda base salvo los ingresos,
 * que van en su moneda. No calcula nada; solo escribe (ADR 0021).
 */
export interface ContinuityInput {
  readonly clientName: string;
  readonly countryName: string;
  /** Día de la ficha: hoy en el país del cliente. */
  readonly date: IsoDate;
  readonly locale: string;
  readonly currency: string;
  readonly age: number | null;
  readonly clientType: ClientType | null;
  readonly dependents: number;
  readonly incomes: readonly {
    readonly name: string;
    readonly amount: Money;
    readonly paymentsPerYear: number;
  }[];
  readonly monthlyExpenses: number;
  readonly essentialMonthly: number;
  /** Anual. */
  readonly programmedSavings: number;
  readonly annualSurplus: number;
  readonly realityCheck: RealityCheckStatus;
  readonly debts: {
    readonly count: number;
    readonly total: number;
    readonly expensive: number;
    /** Null sin deuda cara. */
    readonly payoff: ExpensiveDebtPayoff | null;
  };
  readonly emergency: {
    readonly goal: number;
    readonly balance: number;
    /** Modo nativo: mes en que el sobrante completa el fondo; null si no aplica. */
    readonly completionMonth: IsoDate | null;
  };
  /** Bolsillos con aporte al mes, en el orden del plan. */
  readonly pockets: readonly { readonly name: string; readonly monthly: number }[];
  readonly risk: {
    readonly willingness: RiskLevel | null;
    readonly capacity: RiskLevel;
    readonly final: RiskLevel | null;
  };
  readonly investment: {
    readonly balance: number;
    readonly monthly: number;
    readonly growthShare: number;
    readonly currentGrowth: number;
    readonly currentStability: number;
    readonly horizon: MoneyHorizon | null;
  };
  readonly insurance: { readonly current: readonly string[]; readonly quoting: readonly string[] };
  /** Null es "sin dato". */
  readonly succession: {
    readonly hasWill: boolean | null;
    readonly beneficiariesReviewed: boolean | null;
  };
  readonly assumptions: {
    readonly fxRates: readonly { readonly currency: string; readonly rate: number }[];
    /** Null si el país no tiene el parámetro. */
    readonly minimumWage: Money | null;
    readonly pctToInvestment: number;
  };
  /** Una por línea, como las escribió el asesor. */
  readonly decisions: string;
  readonly pending: readonly {
    readonly title: string;
    readonly owner: ActionOwner;
    readonly dueDate: IsoDate | null;
  }[];
  /** El día de la entrega en el país del cliente. */
  readonly lastDelivery: { readonly label: string; readonly deliveredOn: IsoDate } | null;
  readonly nextReview: IsoDate | null;
}

export interface ContinuityLine {
  readonly field: ContinuityField;
  readonly label: string;
  /** Una lista se muestra con un elemento por línea. */
  readonly value: string | readonly string[];
}

export interface ContinuitySheet {
  /** "FICHA DE CONTINUIDAD - Nombre - fecha", la primera línea del texto para copiar. */
  readonly heading: string;
  /** "Nombre · fecha", para la pantalla. */
  readonly title: string;
  readonly lines: readonly ContinuityLine[];
}

type SheetText = Messages['followUp']['sheet'];
type OwnerText = Messages['actionPlan']['owners'];
type ClientTypeText = Messages['profile']['types'];

/** Las decisiones escritas, una por línea, sin viñetas ni líneas vacías. */
export function decisionList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function count(template: { readonly one: string; readonly other: string }, value: number) {
  return (value === 1 ? template.one : template.other).replace('{count}', String(value));
}

/**
 * La ficha de continuidad del Anexo C con los datos de hoy. La pensión no se analiza en la
 * plataforma (ADR 0016): su línea lo dice. "Archivos" es el último plan entregado.
 */
export function continuitySheet(
  input: ContinuityInput,
  text: SheetText,
  labels: { readonly owners: OwnerText; readonly clientTypes: ClientTypeText },
): ContinuitySheet {
  const { locale, currency } = input;
  const v = text.values;
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const percent = (ratio: number) => formatPercent(ratio, locale, 0);
  const date = (day: string) => formatDate(day, locale, 'UTC');
  const month = (day: string) =>
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${day}T00:00:00Z`),
    );
  const yesNo = (value: boolean | null) => (value === null ? v.unknown : value ? v.yes : v.no);
  const types: Readonly<Record<string, string>> = labels.clientTypes;
  const decisions = decisionList(input.decisions);

  const values: Record<ContinuityField, string | readonly string[]> = {
    profile: [
      input.age === null ? v.ageUnknown : v.age.replace('{age}', String(input.age)),
      types[input.clientType ?? 'none'] ?? labels.clientTypes.none,
      input.countryName,
      input.dependents === 0 ? v.noDependents : count(v.dependents, input.dependents),
    ].join(' · '),
    incomes:
      input.incomes.length === 0
        ? v.noIncomes
        : input.incomes.map((income) =>
            v.income
              .replace('{name}', income.name)
              .replace(
                '{amount}',
                formatMoney(income.amount.amount, income.amount.currency, locale),
              )
              .replace('{payments}', count(v.payments, income.paymentsPerYear)),
          ),
    spending: v.spending
      .replace('{total}', money(input.monthlyExpenses))
      .replace('{essential}', money(input.essentialMonthly)),
    programmedSavings: v.programmedSavings
      .replace('{annual}', money(input.programmedSavings))
      .replace('{monthly}', money(input.programmedSavings / 12)),
    surplus: v.surplus
      .replace('{amount}', money(input.annualSurplus))
      .replace('{status}', v.realityCheck[input.realityCheck]),
    debts:
      input.debts.count === 0
        ? v.noDebts
        : !input.debts.payoff
          ? v.debtsNoExpensive.replace('{total}', money(input.debts.total))
          : v.debts
              .replace('{total}', money(input.debts.total))
              .replace('{expensive}', money(input.debts.expensive))
              .replace(
                '{payoff}',
                input.debts.payoff.date && !input.debts.payoff.exceedsHorizon
                  ? v.payoff.replace('{month}', month(input.debts.payoff.date))
                  : v.payoffBeyond,
              ),
    emergencyFund: [
      v.emergencyFund
        .replace('{goal}', money(input.emergency.goal))
        .replace('{balance}', money(input.emergency.balance)),
      ...(input.emergency.completionMonth
        ? [v.fundComplete.replace('{month}', month(input.emergency.completionMonth))]
        : []),
    ].join(' · '),
    pockets:
      input.pockets.length === 0
        ? v.noPockets
        : input.pockets.map((pocket) =>
            v.pocket.replace('{name}', pocket.name).replace('{amount}', money(pocket.monthly)),
          ),
    riskProfile: v.riskProfile
      .replace(
        '{willingness}',
        input.risk.willingness ? v.levels[input.risk.willingness] : v.unanswered,
      )
      .replace('{capacity}', v.levels[input.risk.capacity])
      .replace('{final}', input.risk.final ? v.levels[input.risk.final] : v.unanswered),
    investment: [
      v.investment
        .replace('{balance}', money(input.investment.balance))
        .replace('{monthly}', money(input.investment.monthly))
        .replace('{growth}', percent(input.investment.growthShare))
        .replace('{stability}', percent(1 - input.investment.growthShare)),
      v.investmentToday
        .replace('{growth}', money(input.investment.currentGrowth))
        .replace('{stability}', money(input.investment.currentStability)),
      input.investment.horizon
        ? v.horizon.replace('{horizon}', v.horizons[input.investment.horizon])
        : v.horizonUnanswered,
    ].join(' · '),
    pension: v.pension,
    insurance: v.insurance
      .replace(
        '{current}',
        input.insurance.current.length ? input.insurance.current.join(', ') : v.none,
      )
      .replace(
        '{quoting}',
        input.insurance.quoting.length ? input.insurance.quoting.join(', ') : v.none,
      ),
    succession: v.succession
      .replace('{will}', yesNo(input.succession.hasWill))
      .replace('{beneficiaries}', yesNo(input.succession.beneficiariesReviewed)),
    assumptions: [
      v.fx.replace(
        '{rates}',
        input.assumptions.fxRates.length === 0
          ? v.noFx.replace('{currency}', currency)
          : input.assumptions.fxRates
              .map((rate) =>
                v.rate.replace('{currency}', rate.currency).replace('{rate}', money(rate.rate)),
              )
              .join(', '),
      ),
      ...(input.assumptions.minimumWage
        ? [
            v.minimumWage.replace(
              '{amount}',
              formatMoney(
                input.assumptions.minimumWage.amount,
                input.assumptions.minimumWage.currency,
                locale,
              ),
            ),
          ]
        : []),
      v.pctToInvestment.replace('{pct}', percent(input.assumptions.pctToInvestment)),
    ].join(' · '),
    decisions: decisions.length > 0 ? decisions : v.noDecisions,
    pending:
      input.pending.length === 0
        ? v.noPending
        : input.pending.map((task) =>
            (task.dueDate ? v.pendingItem : v.pendingItemNoDate)
              .replace('{title}', task.title)
              .replace('{owner}', labels.owners[task.owner])
              .replace('{date}', task.dueDate ? date(task.dueDate) : ''),
          ),
    files: input.lastDelivery
      ? v.files
          .replace('{label}', input.lastDelivery.label)
          .replace('{date}', date(input.lastDelivery.deliveredOn))
      : v.noFiles,
    nextReview: input.nextReview ? date(input.nextReview) : v.noReview,
  };

  return {
    heading: text.heading.replace('{name}', input.clientName).replace('{date}', date(input.date)),
    title: `${input.clientName} · ${date(input.date)}`,
    lines: CONTINUITY_FIELDS.map((field) => ({
      field,
      label: text.labels[field],
      value: values[field],
    })),
  };
}

/** La ficha como bloque de texto para copiar, igual que en el protocolo. */
export function continuityText(sheet: ContinuitySheet): string {
  const lines = [sheet.heading];
  for (const line of sheet.lines) {
    if (typeof line.value === 'string') {
      lines.push(`${line.label}: ${line.value}`);
    } else {
      lines.push(`${line.label}:`, ...line.value.map((item) => `- ${item}`));
    }
  }
  return lines.join('\n');
}
