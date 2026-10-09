import type { CaseStage, DeliveryStage } from '@miluca/domain';
import type { QcReport } from '@miluca/engine';

import { reportForStage } from './catalog';

/**
 * Lo que hace falta saber del caso para la lista de pasos de cada etapa. Se arma con las filas que
 * ya carga la ficha (`progressInput`); aquí no se lee la base.
 */
export interface ProgressInput {
  readonly clientType: string | null;
  readonly incomes: readonly { readonly kind: string | null }[];
  readonly budgetItemCount: number;
  readonly pocketCount: number;
  readonly realityCheckDone: boolean;
  readonly debts: readonly {
    readonly annual_rate: number | null;
    readonly min_payment: number | null;
  }[];
  readonly assetCount: number;
  readonly insuranceCount: number;
  readonly goalCount: number;
  readonly riskProfileAnswered: boolean;
  /** El control de calidad completo; cada etapa mira solo sus controles. */
  readonly report: QcReport;
  /** Etapas con al menos una entrega (`completo` cuenta para las tres). */
  readonly deliveredStages: ReadonlySet<DeliveryStage>;
}

export type CoreStepId = 'profile' | 'incomes';
export type StageStepId =
  | 'expenses'
  | 'pockets'
  | 'realityCheck'
  | 'debts'
  | 'debtTerms'
  | 'assets'
  | 'insurance'
  | 'goals'
  | 'riskProfile'
  | 'checks'
  | 'delivered';

export interface Step<Id extends string> {
  readonly id: Id;
  readonly done: boolean;
}

/** El núcleo: el tipo de cliente decide las reglas (meses de fondo, ingreso base) y los ingresos, todo. */
export function coreSteps(input: ProgressInput): readonly Step<CoreStepId>[] {
  return [
    { id: 'profile', done: input.clientType !== null },
    {
      id: 'incomes',
      done: input.incomes.length > 0 && input.incomes.every((income) => income.kind !== null),
    },
  ];
}

/** Los datos que pide cada etapa, en el orden en que se trabajan en la sesión. */
function dataSteps(stage: CaseStage, input: ProgressInput): Step<StageStepId>[] {
  switch (stage) {
    case 'presupuesto':
      return [
        { id: 'expenses', done: input.budgetItemCount > 0 },
        { id: 'pockets', done: input.pocketCount > 0 },
        { id: 'realityCheck', done: input.realityCheckDone },
      ];
    case 'deudas':
      return [
        { id: 'debts', done: input.debts.length > 0 },
        {
          id: 'debtTerms',
          done:
            input.debts.length > 0 &&
            input.debts.every((debt) => debt.annual_rate !== null && debt.min_payment !== null),
        },
      ];
    case 'patrimonio':
      return [
        { id: 'assets', done: input.assetCount > 0 },
        { id: 'insurance', done: input.insuranceCount > 0 },
        { id: 'goals', done: input.goalCount > 0 },
        { id: 'riskProfile', done: input.riskProfileAnswered },
      ];
  }
}

/**
 * Los pasos de una etapa: sus datos, el control de calidad de la etapa y la entrega. El control solo
 * cuenta como resuelto cuando ya están el núcleo y los datos de la etapa: sin datos, sus controles
 * pasan solos y la marca engañaría.
 */
export function stageSteps(stage: CaseStage, input: ProgressInput): readonly Step<StageStepId>[] {
  const data = dataSteps(stage, input);
  const ready = coreSteps(input).every((step) => step.done) && data.every((step) => step.done);
  const blocking = reportForStage(input.report, stage).blocking.length;
  return [
    ...data,
    { id: 'checks', done: ready && blocking === 0 },
    {
      id: 'delivered',
      done: input.deliveredStages.has(stage) || input.deliveredStages.has('completo'),
    },
  ];
}

/** El primer paso pendiente; null si están todos. */
export function nextStep<Id extends string>(steps: readonly Step<Id>[]): Step<Id> | null {
  return steps.find((step) => !step.done) ?? null;
}

/** ¿Hay algo registrado en la etapa? Una etapa oculta con datos sigue contando en el cálculo. */
export function stageHasData(stage: CaseStage, input: ProgressInput): boolean {
  switch (stage) {
    case 'presupuesto':
      return input.budgetItemCount > 0 || input.pocketCount > 0;
    case 'deudas':
      return input.debts.length > 0;
    case 'patrimonio':
      return input.assetCount > 0 || input.insuranceCount > 0 || input.goalCount > 0;
  }
}
