import { COUNTRY_LOCALES, formatPercent, messages } from '@miluca/i18n';

import type { ComputedCase } from '@/features/summary';

/** Perfil final y % en crecimiento en una línea, para la ficha y Mis datos. */
export function investmentSummary(
  text: { readonly investmentSummary: string; readonly investmentUnanswered: string },
  computed: ComputedCase,
): string {
  const { summary, investment } = computed.result;
  if (summary.riskProfile === null) return text.investmentUnanswered;
  const locale = COUNTRY_LOCALES[computed.rows.client.country_code]?.locale ?? 'es';
  return text.investmentSummary
    .replace('{profile}', messages.es.investment.levels[summary.riskProfile].toLowerCase())
    .replace('{growth}', formatPercent(investment.allocation.growthShare, locale, 1));
}
