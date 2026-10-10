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
  /** Cuentas, bolsillos y efectivo registrados (activos líquidos): el saldo que reparte la etapa 1. */
  readonly liquidAssetCount: number;
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
  /** Pasos opcionales que el asesor omitió para este cliente (ADR 0029). */
  readonly skippedSteps: ReadonlySet<SkippableStepId>;
  /** Documentos del cliente (ADR 0030): los que subió alguna vez y los que siguen sin revisar. */
  readonly files: { readonly uploaded: number; readonly active: number };
}

export type CoreStepId = 'documents' | 'profile' | 'incomes';
export type StageStepId =
  | 'expenses'
  | 'accounts'
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

/**
 * Pasos que el asesor puede omitir (ADR 0029): lo que un cliente puede no tener (documentos,
 * cuentas, bolsillos, deudas, patrimonio, seguros, metas) y lo que el control de calidad solo avisa
 * (prueba de realidad y perfil de riesgo). El perfil, los ingresos, los gastos, la tasa y la cuota
 * de cada deuda, el control y la entrega no.
 */
export const SKIPPABLE_STEPS = [
  'documents',
  'accounts',
  'pockets',
  'realityCheck',
  'debts',
  'assets',
  'insurance',
  'goals',
  'riskProfile',
] as const satisfies readonly (CoreStepId | StageStepId)[];
export type SkippableStepId = (typeof SKIPPABLE_STEPS)[number];

export function isSkippableStep(id: string): id is SkippableStepId {
  return (SKIPPABLE_STEPS as readonly string[]).includes(id);
}

/** Los pasos omitidos guardados, sin los que ya no se pueden omitir. */
export function skippedStepsFrom(values: readonly string[] | null | undefined): SkippableStepId[] {
  return (values ?? []).filter(isSkippableStep);
}

export interface Step<Id extends string> {
  readonly id: Id;
  /** Hecho con los datos del caso u omitido por el asesor: el paso ya no queda pendiente. */
  readonly done: boolean;
  /** Hecho solo porque el asesor lo omitió; con datos, el paso cuenta como hecho sin más. */
  readonly skipped: boolean;
  /** El asesor puede omitirlo o deshacer la omisión. */
  readonly skippable: boolean;
}

/** Un paso que no se omite. */
function required<Id extends string>(id: Id, done: boolean): Step<Id> {
  return { id, done, skipped: false, skippable: false };
}

interface DataStep<Id extends string> {
  readonly id: Id;
  readonly done: boolean;
  /** Omitido por otro paso: la tasa y la cuota cuando el asesor omitió las deudas. */
  readonly skipped?: boolean;
}

/** Un paso de datos con su omisión: los datos mandan; sin ellos, cuenta la marca del asesor. */
function withSkip<Id extends CoreStepId | StageStepId>(
  step: DataStep<Id>,
  skippedSteps: ReadonlySet<SkippableStepId>,
): Step<Id> {
  const skippable = isSkippableStep(step.id);
  const skipped = !step.done && (step.skipped === true || (skippable && skippedSteps.has(step.id)));
  return { id: step.id, done: step.done || skipped, skipped, skippable };
}

/**
 * El núcleo: los documentos que subió el cliente (ADR 0030), que se marcan cuando ya no queda
 * ninguno por revisar; el tipo de cliente, que decide las reglas (meses de fondo, ingreso base), y
 * los ingresos, que usa todo.
 */
export function coreSteps(input: ProgressInput): readonly Step<CoreStepId>[] {
  return [
    withSkip<CoreStepId>(
      { id: 'documents', done: input.files.uploaded > 0 && input.files.active === 0 },
      input.skippedSteps,
    ),
    required<CoreStepId>('profile', input.clientType !== null),
    required<CoreStepId>(
      'incomes',
      input.incomes.length > 0 && input.incomes.every((income) => income.kind !== null),
    ),
  ];
}

/** Los datos que pide cada etapa, en el orden en que se trabajan en la sesión. */
function dataSteps(stage: CaseStage, input: ProgressInput): Step<StageStepId>[] {
  return rawDataSteps(stage, input).map((step) => withSkip(step, input.skippedSteps));
}

function rawDataSteps(stage: CaseStage, input: ProgressInput): DataStep<StageStepId>[] {
  switch (stage) {
    case 'presupuesto':
      return [
        { id: 'expenses', done: input.budgetItemCount > 0 },
        // El saldo de hoy llena el fondo y los bolsillos (ADR 0028): sin cuentas, el fondo queda en 0.
        { id: 'accounts', done: input.liquidAssetCount > 0 },
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
          // Sin deudas y con ese paso omitido, no hay tasa ni cuota que completar.
          skipped: input.debts.length === 0 && input.skippedSteps.has('debts'),
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
  // Los documentos ayudan a registrar, pero no son datos del cálculo: no frenan el control.
  const core = coreSteps(input).filter((step) => step.id !== 'documents');
  const ready = core.every((step) => step.done) && data.every((step) => step.done);
  const blocking = reportForStage(input.report, stage).blocking.length;
  return [
    ...data,
    required<StageStepId>('checks', ready && blocking === 0),
    required<StageStepId>(
      'delivered',
      input.deliveredStages.has(stage) || input.deliveredStages.has('completo'),
    ),
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
      return input.budgetItemCount > 0 || input.pocketCount > 0 || input.liquidAssetCount > 0;
    case 'deudas':
      return input.debts.length > 0;
    case 'patrimonio':
      return input.assetCount > 0 || input.insuranceCount > 0 || input.goalCount > 0;
  }
}
