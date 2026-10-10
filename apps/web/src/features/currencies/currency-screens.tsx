import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatDate, type Messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen, ScreenActions } from '@/components/screen';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import { todayIn } from '@/lib/dates';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { deleteFxRate, saveFxRate, type FxRateFormError } from './actions';
import { currencyOptions } from './currency-options';
import { FxRateForm, type FxRateFormText } from './fx-rate-form';
import { loadOfficialSources } from './official-rate-sources';
import { officialRateViews } from './official-rate-views';
import { currencyPaths } from './paths';

function screenText(t: Messages, viewer: CaseEditor) {
  const text = t.currencies;
  if (viewer.role === 'advisor') {
    return { intro: text.intro, back: { href: '', label: text.back }, form: text.form };
  }
  const client = withAddress(text.client, viewer.formOfAddress);
  return {
    intro: client.intro,
    back: { href: '/mis-datos', label: client.back },
    form: { ...text.form, rateHint: client.rateHint, noteHint: client.noteHint },
  };
}

/** P-A19 Monedas del cliente: la tasa que recibe por cada moneda distinta de la base. */
export async function CurrenciesScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const t = await getMessages();
  const text = t.currencies;
  const paths = currencyPaths(viewer.role, clientId);
  const local = screenText(t, viewer);
  const back = viewer.role === 'advisor' ? `/clientes/${clientId}` : local.back.href;
  const computed = await loadComputedCase(clientId);
  const locale = computed ? await getLocale(computed.rows.client.country_code) : '';

  return (
    <Screen>
      <BackLink href={back} label={local.back.label} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
      {computed ? (
        <>
          <p className="font-medium">
            {text.baseCurrency.replace('{currency}', computed.rows.client.base_currency)}
          </p>
          {computed.rows.fxRates.length === 0 ? (
            <p className="text-text-muted">{text.empty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {computed.rows.fxRates.map((rate) => {
                return (
                  <li key={rate.currency}>
                    <Link
                      href={paths.item(rate.currency)}
                      className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                    >
                      <span className="font-medium tabular-nums">
                        {text.rateSummary
                          .replace('{currency}', rate.currency)
                          .replace(
                            '{rate}',
                            `${amountToText(rate.rate_to_base, locale, 8)} ${computed.rows.client.base_currency}`,
                          )}
                      </span>
                      <span className="text-sm text-text-muted">
                        {/* Fecha sin hora: se muestra tal cual, sin zona horaria. */}
                        {text.asOf.replace('{date}', formatDate(rate.as_of, locale, 'UTC'))}
                        {rate.note ? ` · ${rate.note}` : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.list}
        />
      )}
      <ScreenActions>
        <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
          {text.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}

const FORM_ERRORS: readonly FxRateFormError[] = ['inUse', 'notAllowed', 'notFound', 'unavailable'];

/**
 * Registrar (`currency` null) o cambiar la tasa de una moneda. Las tasas oficiales (ADR 0032) se
 * piden a la vez que el caso y llegan al formulario como promesa, sin frenarlo.
 */
export async function FxRateScreen({
  viewer,
  clientId,
  currency,
  errorParam,
}: {
  viewer: CaseEditor;
  clientId: string;
  currency: string | null;
  errorParam: string | undefined;
}) {
  const t = await getMessages();
  const text = t.currencies;
  const paths = currencyPaths(viewer.role, clientId);
  const local = screenText(t, viewer);
  const title = currency ? text.form.editTitle.replace('{currency}', currency) : text.form.newTitle;
  const sources = loadOfficialSources();
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={currency ? paths.item(currency) : paths.add}
        />
      </Screen>
    );
  }
  const { client, fxRates } = computed.rows;
  const rate = currency ? fxRates.find((row) => row.currency === currency) : null;
  if (currency && !rate) notFound();
  const locale = await getLocale(client.country_code);
  const today = todayIn(client.country_code);
  const formText: FxRateFormText = { form: local.form, useOfficialRate: text.official.use };
  const options = currencyOptions(text.common, {
    base: client.base_currency,
    existing: fxRates.map((row) => row.currency),
    locale,
  });
  const officialRates = officialRateViews(sources, {
    base: client.base_currency,
    today,
    locale,
    text: text.official,
  });
  const initialError = FORM_ERRORS.find((error) => error === errorParam) ?? null;

  return (
    <Screen>
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <FxRateForm
        text={formText}
        baseCurrency={client.base_currency}
        currencyOptions={options}
        officialRates={officialRates}
        isNew={currency === null}
        initialError={initialError}
        initial={{
          currency: rate?.currency ?? '',
          rate: rate ? amountToText(rate.rate_to_base, locale, 8) : '',
          asOf: rate?.as_of ?? today,
          note: rate?.note ?? '',
        }}
        action={saveFxRate.bind(null, clientId, currency)}
        deleteAction={currency ? deleteFxRate.bind(null, clientId, currency) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
