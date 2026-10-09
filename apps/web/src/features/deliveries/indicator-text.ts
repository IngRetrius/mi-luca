import type { Messages } from '@miluca/i18n';

import type { Indicator } from './indicators';

type IndicatorText = Messages['plan']['indicators'];

/**
 * La frase de un indicador, en cifras del país, y su referencia del protocolo. La usan la pantalla
 * del plan, el inicio del cliente y el PDF (ADR 0028).
 */
export function indicatorLines(
  indicator: Indicator,
  text: IndicatorText,
  money: (amount: number) => string,
  percent: (ratio: number) => string,
): { label: string; value: string; sentence: string; reference: string } {
  switch (indicator.id) {
    case 'surplus':
      return {
        label: text.surplus.label,
        value: money(indicator.annualSurplus),
        sentence: (indicator.annualSurplus >= 0 ? text.surplus.ok : text.surplus.alert).replace(
          '{amount}',
          money(Math.abs(indicator.annualSurplus)),
        ),
        reference: text.surplus.reference,
      };
    case 'savingsRate':
      return {
        label: text.savingsRate.label,
        value: percent(indicator.rate),
        sentence:
          indicator.rate < 0
            ? text.savingsRate.negative
            : text.savingsRate.text.replace('{count}', String(Math.round(indicator.rate * 100))),
        reference: text.savingsRate.reference,
      };
    case 'debtLoad':
      return {
        label: text.debtLoad.label,
        value: percent(indicator.load),
        sentence: text.debtLoad.text.replace('{count}', String(Math.round(indicator.load * 100))),
        reference: text.debtLoad.reference,
      };
    case 'emergencyFund': {
      const interim =
        indicator.currentGoal < indicator.fullGoal
          ? ` ${text.emergencyFund.interim.replace('{full}', money(indicator.fullGoal))}`
          : '';
      return {
        label: text.emergencyFund.label,
        value: percent(indicator.currentGoal === 0 ? 1 : indicator.balance / indicator.currentGoal),
        sentence:
          text.emergencyFund.text
            .replace('{balance}', money(indicator.balance))
            .replace('{goal}', money(indicator.currentGoal)) + interim,
        reference: text.emergencyFund.reference,
      };
    }
    case 'concentration':
      return {
        label: text.concentration.label,
        value: percent(indicator.share),
        sentence: text.concentration.text.replace('{share}', percent(indicator.share)),
        reference: text.concentration.reference,
      };
  }
}
