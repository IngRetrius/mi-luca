import type { ReceivablePayments } from '../receivables';
import { at, flowRow, type FlowRow, type MonthValues } from './months';

export interface SurplusDestinationInput {
  /** Sobrante de cada mes. @excel Flujo anual!E22:P22 */
  readonly surplus: MonthValues;
  /** @excel Deudas!C23 */
  readonly hasExpensiveDebt: boolean;
  /** Parte del sobrante que va a deudas cuando hay deuda cara. @excel Supuestos!C25 */
  readonly pctToDebt: number;
  /** Parte del sobrante que va a inversión, según la prueba de realidad. @excel Supuestos!C42 */
  readonly pctToInvestment: number;
  readonly receivables: ReceivablePayments;
}

export interface SurplusDestination {
  /** @excel Flujo anual!E24:Q24 */
  readonly extraToDebt: FlowRow;
  /** @excel Flujo anual!E25:Q25 */
  readonly toInvestment: FlowRow;
  /** Lo que queda libre del sobrante. @excel Flujo anual!E26:Q26 */
  readonly freeMargin: FlowRow;
  /** @excel Flujo anual!E28:Q28 */
  readonly receivablesReceived: FlowRow;
  /** @excel Flujo anual!E29:Q29 */
  readonly receivablesToDebt: FlowRow;
  /** @excel Flujo anual!E30:Q30 */
  readonly receivablesToInvestment: FlowRow;
  /** @excel Flujo anual!E31:Q31 */
  readonly receivablesFree: FlowRow;
  /** Sobrante y abonos a inversión. @excel Flujo anual!E33:Q33 */
  readonly totalToInvestment: FlowRow;
  /** Sobrante y abonos a deudas. @excel Flujo anual!E34:Q34 */
  readonly totalExtraToDebt: FlowRow;
}

/**
 * Destino del sobrante y de los abonos de cuentas por cobrar (RN-043, RN-044). Con deuda cara no
 * se invierte: una parte del sobrante y todos los abonos van a deudas. Sin deuda cara, una parte
 * del sobrante y de cada abono va a inversión. Un mes negativo no reparte nada.
 */
export function surplusDestination(input: SurplusDestinationInput): SurplusDestination {
  const { surplus, hasExpensiveDebt, receivables } = input;
  const extraToDebt = flowRow((month) =>
    hasExpensiveDebt ? Math.max(0, at(surplus, month)) * input.pctToDebt : 0,
  );
  const toInvestment = flowRow((month) =>
    hasExpensiveDebt ? 0 : Math.max(0, at(surplus, month)) * input.pctToInvestment,
  );
  const freeMargin = flowRow(
    (month) => at(surplus, month) - at(extraToDebt.months, month) - at(toInvestment.months, month),
  );
  const receivablesReceived = flowRow((month) => at(receivables.received, month));
  const receivablesToDebt = flowRow((month) =>
    hasExpensiveDebt ? at(receivables.received, month) : 0,
  );
  const receivablesToInvestment = flowRow((month) =>
    hasExpensiveDebt ? 0 : at(receivables.forInvestment, month),
  );
  const receivablesFree = flowRow(
    (month) =>
      at(receivablesReceived.months, month) -
      at(receivablesToDebt.months, month) -
      at(receivablesToInvestment.months, month),
  );
  return {
    extraToDebt,
    toInvestment,
    freeMargin,
    receivablesReceived,
    receivablesToDebt,
    receivablesToInvestment,
    receivablesFree,
    totalToInvestment: flowRow(
      (month) => at(toInvestment.months, month) + at(receivablesToInvestment.months, month),
    ),
    totalExtraToDebt: flowRow(
      (month) => at(extraToDebt.months, month) + at(receivablesToDebt.months, month),
    ),
  };
}
