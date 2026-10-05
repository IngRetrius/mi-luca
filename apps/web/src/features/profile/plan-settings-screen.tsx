import { formatPercent } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { loadCaseRows } from '@/features/summary';
import { amountToText, percentToText } from '@/lib/amount';
import { getLocale, getMessages } from '@/server/i18n';

import { savePlanSettings } from './actions';
import { PlanSettingsForm } from './plan-settings-form';
import { PLAN_PERCENTS, type PlanField } from './plan-settings-validation';

/** Sin tipo de cliente, la plantilla usa 3 meses (`Supuestos!C19`). */
const MONTHS_WITHOUT_TYPE = 3;

/** Supuestos del plan del caso (`Supuestos!C20:C32`), con la metodología como referencia. */
export async function PlanSettingsScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.planSettings;
  const back = `/clientes/${clientId}`;
  const rows = await loadCaseRows(clientId);
  const header = (
    <>
      <BackLink href={back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!rows) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={`${back}/supuestos`}
        />
      </Screen>
    );
  }
  const { client, methodology, settings } = rows;
  const locale = await getLocale(client.country_code);
  const pct = (value: number) => formatPercent(value, locale, 0);
  const months =
    (client.client_type
      ? methodology.emergencyMonthsByClientType[client.client_type]
      : undefined) ?? MONTHS_WITHOUT_TYPE;
  const form = text.form;
  const help = Object.fromEntries(
    (['emergencyMonths', ...PLAN_PERCENTS, 'cushion'] as const).map((field) => [
      field,
      {
        label: t.common.helpFor.replace('{label}', t.assumptions.labels[field]),
        text: t.assumptions.help[field],
      },
    ]),
  ) as Record<PlanField, { label: string; text: string }>;

  return (
    <Screen>
      {header}
      <PlanSettingsForm
        text={form}
        hints={{
          emergencyMonths: form.emergencyMonthsHint.replace('{value}', String(months)),
          expensiveDebtThreshold: form.expensiveDebtThresholdHint.replace(
            '{value}',
            pct(methodology.expensiveDebtThreshold),
          ),
          pctInvestConfirmed: form.percentHint.replace(
            '{value}',
            pct(methodology.pctSurplusInvestConfirmed),
          ),
          pctInvestPending: form.percentHint.replace(
            '{value}',
            pct(methodology.pctSurplusInvestPending),
          ),
          pctSurplusToDebt: form.percentHint.replace('{value}', pct(methodology.pctSurplusToDebt)),
          pctExcessToInvest: form.percentHint.replace(
            '{value}',
            pct(methodology.pctExcessToInvest),
          ),
          cushion: form.cushionHint,
          cushionLabel: form.cushion.replace('{currency}', client.base_currency),
        }}
        help={help}
        initial={{
          emergencyMonths: amountToText(settings?.emergency_months_override ?? null, locale, 1),
          expensiveDebtThreshold: percentToText(settings?.expensive_debt_threshold ?? null, locale),
          pctInvestConfirmed: percentToText(settings?.pct_surplus_invest_confirmed ?? null, locale),
          pctInvestPending: percentToText(settings?.pct_surplus_invest_pending ?? null, locale),
          pctSurplusToDebt: percentToText(settings?.pct_surplus_to_debt ?? null, locale),
          pctExcessToInvest: percentToText(settings?.pct_excess_to_invest ?? null, locale),
          cushion: amountToText(settings?.operating_cushion || null, locale),
        }}
        action={savePlanSettings.bind(null, clientId)}
        cancelHref={back}
      />
    </Screen>
  );
}
