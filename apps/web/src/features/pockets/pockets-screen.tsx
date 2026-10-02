import Link from 'next/link';

import type { PocketRow } from '@miluca/engine';
import { COUNTRY_LOCALES, formatMoney, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { ModuleLink } from '@/components/back-link';
import { Screen, ScreenActions } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import type { CaseEditor } from '@/server/case-access';

import { pocketPaths, type SpecialPocketKind } from './paths';

const t = messages.es;
const text = t.pockets;

/**
 * P-A10 Análisis, pestaña Bolsillos: meta del año, aporte al mes y saldo de cada bolsillo, y el
 * reparto del saldo líquido de hoy (RN-070 a RN-074). Los saldos del fondo y de meses sin ingreso
 * los sugiere el motor; los de los generales los escribe el asesor o el cliente.
 */
export async function PocketsScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const paths = pocketPaths(viewer.role, clientId);
  const local =
    viewer.role === 'advisor'
      ? { back: text.back, intro: text.intro }
      : withAddress(text.client, viewer.formOfAddress);
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.list}
        />
      </Screen>
    );
  }

  const { client } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const { pockets } = computed.result;
  const general = computed.rows.pockets.filter((pocket) => pocket.kind === 'general');
  const bankName = new Map(computed.rows.banks.map((bank) => [bank.id, bank.name]));
  const bankDetail = (bankId: string | null | undefined) => {
    const bank = bankId ? bankName.get(bankId) : undefined;
    return bank ? text.bankOf.replace('{bank}', bank) : text.noBank;
  };
  // El fondo y meses sin ingreso: meta y saldo del motor; el banco lo elige quien edita.
  const special = (kind: SpecialPocketKind, name: string, row: PocketRow) => ({
    key: kind,
    name,
    row,
    href: paths.special(kind),
    suggested: true,
    detail: bankDetail(computed.rows.pockets.find((pocket) => pocket.kind === kind)?.bank_id),
  });
  const rows: {
    key: string;
    name: string;
    row: PocketRow;
    href: string | null;
    suggested: boolean;
    detail: string | null;
  }[] = [
    special('emergencia', text.emergency, pockets.emergency),
    special('meses_sin_ingreso', text.noIncome, pockets.noIncome),
    ...pockets.general.map((row, index) => {
      const pocket = general[index];
      return {
        key: pocket?.id ?? String(index),
        name: pocket?.name ?? text.unnamed,
        row,
        href: pocket ? paths.item(pocket.id) : null,
        suggested: false,
        detail: bankDetail(pocket?.bank_id),
      };
    }),
  ];

  return (
    <Screen>
      {header}
      <p className="-mt-4 text-sm text-text-muted">
        {text.currencyNote.replace('{currency}', client.base_currency)}
      </p>

      <section aria-labelledby="pockets-title" className="flex flex-col gap-2">
        <h2 id="pockets-title" className="sr-only">
          {text.title}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {rows.map(({ key, name, row, href, suggested, detail }) => (
            <li key={key} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-medium wrap-anywhere">{name}</h3>
                {href ? (
                  <Link
                    href={href}
                    className={`-my-3 inline-flex min-h-12 items-center rounded-xl px-2 text-link hover:underline ${focusRing}`}
                  >
                    {text.edit}
                    <span className="sr-only">: {name}</span>
                  </Link>
                ) : null}
              </div>
              {detail ? <p className="text-sm text-text-muted">{detail}</p> : null}
              <FigureList
                figures={[
                  { label: text.annualGoal, value: money(row.annualGoal) },
                  { label: text.monthly, value: money(row.monthlyContribution) },
                  {
                    label: suggested ? `${text.balance} (${text.suggested})` : text.balance,
                    value: money(row.balance),
                  },
                ]}
              />
            </li>
          ))}
        </ul>
        {general.length === 0 ? <p className="text-sm text-text-muted">{text.empty}</p> : null}
        <FigureList
          figures={[
            { label: text.totalGoal, value: money(pockets.total.annualGoal) },
            { label: text.totalMonthly, value: money(pockets.total.monthlyContribution) },
          ]}
        />
        <p className="text-sm text-text-muted">
          {text.withContribution.replace('{count}', String(pockets.withContribution))}
        </p>
      </section>

      <section
        aria-labelledby="allocation-title"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="allocation-title" className="font-semibold">
          {text.allocationTitle}
        </h2>
        <FigureList
          figures={[
            { label: text.liquid, value: money(pockets.liquidAssets) },
            { label: text.cushion, value: money(pockets.operatingCushion) },
            { label: text.available, value: money(pockets.available) },
            { label: text.assigned, value: money(pockets.assigned) },
            { label: text.excess, value: money(pockets.excess) },
            ...(pockets.lumpSumToDebt > 0
              ? [{ label: text.lumpDebt, value: money(pockets.lumpSumToDebt) }]
              : []),
            { label: text.lumpInvestment, value: money(pockets.lumpSumToInvestment) },
            { label: text.unallocated, value: money(pockets.unallocated) },
          ]}
        />
        {pockets.overAllocated ? (
          <p className="flex flex-col gap-1 text-sm">
            <StatusLabel status="alert" label={t.status.alert} />
            {text.overAllocated}
          </p>
        ) : null}
        <p className="text-sm text-text-muted">{text.order}</p>
      </section>

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <li>
          <ModuleLink
            href={paths.banks}
            title={text.manageBanks}
            summary={text.banksSummary.replace('{count}', String(computed.rows.banks.length))}
          />
        </li>
      </ul>

      <ScreenActions>
        <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
          {text.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}
