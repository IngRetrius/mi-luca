import Link from 'next/link';
import { notFound } from 'next/navigation';

import { assetTypeSchema } from '@miluca/domain';
import { CONCENTRATION_THRESHOLD, NET_WORTH_GROUPS } from '@miluca/engine';
import { formatMoney, formatPercent, type Messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen, ScreenActions } from '@/components/screen';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { deleteAsset, saveAsset } from './actions';
import { AssetForm } from './asset-form';
import { assetPaths } from './paths';

/** Textos según quién mira: el asesor habla del cliente; el cliente, en su trato. */
function localText(t: Messages, viewer: CaseEditor) {
  const text = t.assets;
  if (viewer.role === 'advisor') {
    return { title: text.title, intro: text.intro, back: text.back, empty: text.empty };
  }
  return withAddress(text.client, viewer.formOfAddress);
}

function loadError(t: Messages, retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/**
 * Patrimonio (P-A10 y Mis datos): patrimonio neto, composición y concentración (RN-110) y los
 * activos, con el saldo líquido que se reparte en los bolsillos (`Patrimonio!C33`).
 */
export async function AssetsScreen({ viewer, clientId }: { viewer: CaseEditor; clientId: string }) {
  const t = await getMessages();
  const text = t.assets;
  const paths = assetPaths(viewer.role, clientId);
  const local = localText(t, viewer);
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        {loadError(t, paths.list)}
      </Screen>
    );
  }
  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  const money = (amount: number, currency = client.base_currency) =>
    formatMoney(amount, currency, locale);

  const percent = (ratio: number) => formatPercent(ratio, locale, 1);
  const { netWorth } = computed.result;
  const nw = text.netWorth;
  const concentrated = netWorth.concentration > CONCENTRATION_THRESHOLD;

  return (
    <Screen>
      {header}
      <section aria-labelledby="net-worth-title" className="flex flex-col gap-2">
        <h2 id="net-worth-title" className="font-semibold">
          {nw.title}
        </h2>
        <FigureList
          figures={[
            { label: nw.totalAssets, value: money(netWorth.totalAssets) },
            { label: nw.debts, value: money(netWorth.debts) },
            { label: nw.netWorth, value: money(netWorth.netWorth) },
          ]}
        />
        <h3 className="mt-2 text-sm font-medium">{nw.composition}</h3>
        <FigureList
          figures={NET_WORTH_GROUPS.map((group) => ({
            label: nw.groups[group],
            value: nw.share
              .replace('{value}', money(netWorth.composition[group].value))
              .replace('{share}', percent(netWorth.composition[group].share)),
          }))}
        />
        <FigureList
          figures={[{ label: nw.concentration, value: percent(netWorth.concentration) }]}
        />
        <p className="text-sm text-text-muted">
          {concentrated ? nw.concentrationHigh : nw.concentrationOk}
        </p>
      </section>
      <section aria-labelledby="assets-title" className="flex flex-col gap-2">
        <h2 id="assets-title" className="font-semibold">
          {nw.assetsTitle}
        </h2>
        {computed.rows.assets.length === 0 ? (
          <p className="text-text-muted">{local.empty}</p>
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
      </section>
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
  viewer,
  clientId,
  assetId,
}: {
  viewer: CaseEditor;
  clientId: string;
  assetId: string | null;
}) {
  const t = await getMessages();
  const text = t.assets;
  const paths = assetPaths(viewer.role, clientId);
  const local = localText(t, viewer);
  const title = assetId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(t, assetId ? paths.item(assetId) : paths.add)}
      </Screen>
    );
  }
  const row = assetId ? computed.rows.assets.find((asset) => asset.id === assetId) : null;
  if (assetId && !row) notFound();
  const { client, fxRates } = computed.rows;
  const locale = await getLocale(client.country_code);

  return (
    <Screen>
      <BackLink href={paths.list} label={local.title} />
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
