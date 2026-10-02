import Link from 'next/link';
import { notFound } from 'next/navigation';

import { assetTypeSchema } from '@miluca/domain';
import { COUNTRY_LOCALES, formatMoney, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen, ScreenActions } from '@/components/screen';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { amountToText } from '@/lib/amount';

import { deleteAsset, saveAsset } from './actions';
import { AssetForm } from './asset-form';
import { assetPaths } from './paths';

const t = messages.es;
const text = t.assets;

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** Patrimonio (activos) con el saldo líquido que se reparte en los bolsillos (`Patrimonio!C33`). */
export async function AssetsScreen({ clientId }: { clientId: string }) {
  const paths = assetPaths(clientId);
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

  return (
    <Screen>
      {header}
      {computed.rows.assets.length === 0 ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <>
          <FigureList
            figures={[{ label: text.liquidTotal, value: money(computed.result.liquidAssets) }]}
          />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {computed.rows.assets.map((asset) => {
              const type = assetTypeSchema.catch('otro').parse(asset.asset_type);
              return (
                <li key={asset.id}>
                  <Link
                    href={paths.item(asset.id)}
                    className={`flex min-h-12 items-start justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium wrap-anywhere">{asset.name}</span>
                      <span className="text-sm text-text-muted">
                        {[text.types[type], asset.generates_income ? text.generatesIncome : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-medium tabular-nums">
                      {money(asset.value, asset.currency)}
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

/** Crear (`assetId` null) o editar un activo. */
export async function AssetFormScreen({
  clientId,
  assetId,
}: {
  clientId: string;
  assetId: string | null;
}) {
  const paths = assetPaths(clientId);
  const title = assetId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(assetId ? paths.item(assetId) : paths.add)}
      </Screen>
    );
  }
  const row = assetId ? computed.rows.assets.find((asset) => asset.id === assetId) : null;
  if (assetId && !row) notFound();
  const { client, fxRates } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';

  return (
    <Screen>
      <BackLink href={paths.list} label={text.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <AssetForm
        text={text.form}
        types={text.types}
        typeHints={text.typeHints}
        initial={{
          name: row?.name ?? '',
          assetType: assetTypeSchema.catch('liquido').parse(row?.asset_type ?? 'liquido'),
          value: amountToText(row?.value ?? null, locale),
          currency: row?.currency ?? client.base_currency,
          generatesIncome: row?.generates_income ?? false,
          note: row?.note ?? '',
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        action={saveAsset.bind(null, clientId, assetId)}
        deleteAction={assetId ? deleteAsset.bind(null, clientId, assetId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
