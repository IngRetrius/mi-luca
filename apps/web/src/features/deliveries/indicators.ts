import type { DeliveryStage } from '@miluca/domain';
import type { CaseResult } from '@miluca/engine';

import type { Status } from '@/components/status';

/**
 * Referencias orientativas del protocolo (sección 7), no reglas: tasa de ahorro sobre 20 % es buena
 * y sobre 30 % muy buena; carga de deuda bajo 30 % manejable y sobre 40 % alerta; más de 80 % del
 * patrimonio en inmuebles y vehículos es poco líquido. **Supuesto** (G16): sirven de semáforo para el
 * cliente en su plan (ADR 0028).
 */
export const REFERENCES = {
  savingsGood: 0.2,
  savingsVeryGood: 0.3,
  debtManageable: 0.3,
  debtAlert: 0.4,
  concentration: 0.8,
} as const;

/** Diferencia por debajo de la cual una meta cuenta como completa (medio peso de redondeo). */
const COMPLETE = 0.999;

export type Indicator =
  | { readonly id: 'surplus'; readonly status: Status; readonly annualSurplus: number }
  | { readonly id: 'savingsRate'; readonly status: Status; readonly rate: number }
  | { readonly id: 'debtLoad'; readonly status: Status; readonly load: number }
  | {
      readonly id: 'emergencyFund';
      readonly status: Status;
      readonly balance: number;
      readonly currentGoal: number;
      readonly fullGoal: number;
    }
  | { readonly id: 'concentration'; readonly status: Status; readonly share: number };

export type IndicatorId = Indicator['id'];

/** Qué indicadores lleva el reporte de cada etapa; el plan completo junta los de las tres. */
const BY_STAGE: Readonly<Record<DeliveryStage, readonly IndicatorId[]>> = {
  presupuesto: ['surplus', 'savingsRate', 'emergencyFund'],
  deudas: ['surplus', 'debtLoad'],
  patrimonio: ['emergencyFund', 'concentration'],
  completo: ['surplus', 'savingsRate', 'debtLoad', 'emergencyFund'],
};

function savingsStatus(rate: number): Status {
  if (rate >= REFERENCES.savingsGood) return 'ok';
  return rate >= 0 ? 'warning' : 'alert';
}

function debtStatus(load: number): Status {
  if (load <= REFERENCES.debtManageable) return 'ok';
  return load <= REFERENCES.debtAlert ? 'warning' : 'alert';
}

/**
 * Los indicadores de un plan entregado con su semáforo, leídos de lo que guardó la entrega. Se omite
 * el que no aplica: la carga de deuda sin deudas, el fondo sin meta, la concentración sin activos o
 * lo que una entrega de una versión anterior no trae.
 */
export function planIndicators(stage: DeliveryStage, results: Partial<CaseResult>): Indicator[] {
  const { summary, emergencyFund, pockets, netWorth } = results;
  const list: Indicator[] = [];
  for (const id of BY_STAGE[stage]) {
    switch (id) {
      case 'surplus':
        if (summary) {
          const annualSurplus = summary.annualSurplus;
          list.push({ id, status: annualSurplus >= 0 ? 'ok' : 'alert', annualSurplus });
        }
        break;
      case 'savingsRate':
        if (summary && summary.savingsRate !== null) {
          list.push({ id, status: savingsStatus(summary.savingsRate), rate: summary.savingsRate });
        }
        break;
      case 'debtLoad':
        if (summary && summary.totalDebt > 0 && summary.debtLoad !== null) {
          list.push({ id, status: debtStatus(summary.debtLoad), load: summary.debtLoad });
        }
        break;
      case 'emergencyFund':
        if (emergencyFund && pockets && emergencyFund.fullGoal > 0) {
          const balance = pockets.emergency.balance;
          const progress =
            emergencyFund.currentGoal === 0 ? 1 : balance / emergencyFund.currentGoal;
          list.push({
            id,
            status: progress >= COMPLETE ? 'ok' : balance > 0 ? 'warning' : 'alert',
            balance,
            currentGoal: emergencyFund.currentGoal,
            fullGoal: emergencyFund.fullGoal,
          });
        }
        break;
      case 'concentration':
        if (netWorth && netWorth.totalAssets > 0) {
          const share = netWorth.concentration;
          list.push({ id, status: share > REFERENCES.concentration ? 'warning' : 'ok', share });
        }
        break;
    }
  }
  return list;
}
