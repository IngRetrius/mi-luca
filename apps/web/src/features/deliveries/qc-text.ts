import type { QcItem } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

export interface QcFormat {
  readonly money: (amount: number) => string;
  readonly percent: (ratio: number) => string;
}

/** El mensaje de un control, con sus cifras en el formato del país del cliente. */
export function qcMessage(
  item: QcItem,
  text: Messages['quality']['checks'],
  { money, percent }: QcFormat,
): string {
  const template = text[item.code][item.passed ? 'ok' : 'failed'];
  const number = (key: string) => {
    const value = item.detail[key];
    return typeof value === 'number' ? value : 0;
  };
  const currencies = item.detail.currencies;
  const difference =
    item.code === 'reality_check_confirms'
      ? percent(number('difference'))
      : money(Math.abs(number('difference')));
  return template
    .replace('{difference}', difference)
    .replace('{budget}', money(number('budgetMonthly')))
    .replace('{pockets}', money(number('pocketsMonthly')))
    .replace('{excess}', money(Math.abs(number('excess'))))
    .replace('{shortfall}', money(number('shortfall')))
    .replace('{positive}', money(number('positiveSum')))
    .replace('{count}', String(number('count')))
    .replace('{growth}', percent(number('growthShare')))
    .replace('{min}', percent(number('rangeMin')))
    .replace('{max}', percent(number('rangeMax')))
    .replace('{currencies}', Array.isArray(currencies) ? currencies.join(', ') : '');
}
