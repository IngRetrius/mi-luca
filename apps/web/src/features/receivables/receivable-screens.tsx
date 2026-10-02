import Link from 'next/link';
import { notFound } from 'next/navigation';

import { COUNTRY_LOCALES, formatDate, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen, ScreenActions } from '@/components/screen';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { amountToText, percentToText } from '@/lib/amount';

import { deleteReceivable, saveReceivable } from './actions';
import { receivablePaths } from './paths';
import { ReceivableForm } from './receivable-form';

const t = messages.es;
const text = t.receivables;

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** Cuentas por cobrar (P-A10, pestaña Cobros): cuotas, último pago y saldo pendiente hoy. */
export async function ReceivablesScreen({ clientId }: { clientId: string }) {
  const paths = receivablePaths(clientId);
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={`/clientes/${clientId}`} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        {loadError(paths.list)}
      </Screen>
    );
  }
  const { client } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number, currency = client.base_currency) =>
    formatMoney(amount, currency, locale);
  const { receivables } = computed.result;

  return (
    <Screen>
      {header}
      {computed.rows.receivables.length === 0 ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <>
          <FigureList
            figures={[{ label: text.pendingTotal, value: money(receivables.totalPending) }]}
          />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {computed.rows.receivables.map((row, index) => {
              const result = receivables.rows[index];
              return (
                <li key={row.id}>
                  <Link
                    href={paths.item(row.id)}
                    className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium wrap-anywhere">{row.debtor_label}</span>
                      <span className="font-medium tabular-nums">
                        {text.pending.replace('{amount}', money(result?.pendingAtCutoff ?? 0))}
                      </span>
                    </span>
                    <span className="text-sm text-text-muted">
                      {text.itemSummary
                        .replace('{payment}', money(row.monthly_payment, row.currency))
                        .replace('{installments}', String(result?.installments ?? '—'))}
                    </span>
                    <span className="text-sm text-text-muted">
                      {result?.lastPaymentDate
                        ? text.lastPayment.replace(
                            '{date}',
                            formatDate(result.lastPaymentDate, locale, 'UTC'),
                          )
                        : text.noDate}
                      {' · '}
                      {text.toInvestment.replace(
                        '{pct}',
                        formatPercent(row.pct_to_investment, locale, 0),
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <ScreenActions>
        <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
          {text.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}

/** Crear (`receivableId` null) o editar un cobro. */
export async function ReceivableFormScreen({
  clientId,
  receivableId,
}: {
  clientId: string;
  receivableId: string | null;
}) {
  const paths = receivablePaths(clientId);
  const title = receivableId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(receivableId ? paths.item(receivableId) : paths.add)}
      </Screen>
    );
  }
  const row = receivableId
    ? computed.rows.receivables.find((item) => item.id === receivableId)
    : null;
  if (receivableId && !row) notFound();
  const { client, fxRates } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';

  return (
    <Screen>
      <BackLink href={paths.list} label={text.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <ReceivableForm
        text={text.form}
        initial={{
          debtor: row?.debtor_label ?? '',
          balance: amountToText(row?.balance ?? null, locale),
          payment: amountToText(row?.monthly_payment ?? null, locale),
          currency: row?.currency ?? client.base_currency,
          firstPayment: row?.first_payment_date ?? '',
          pctToInvestment: percentToText(row?.pct_to_investment ?? null, locale),
          note: row?.note ?? '',
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        advisor
        action={saveReceivable.bind(null, clientId, receivableId)}
        deleteAction={receivableId ? deleteReceivable.bind(null, clientId, receivableId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
