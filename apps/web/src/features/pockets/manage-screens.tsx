import Link from 'next/link';
import { notFound } from 'next/navigation';

import { COUNTRY_LOCALES, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen, ScreenActions } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadCaseRows } from '@/features/summary';
import { amountToText } from '@/lib/amount';

import { deleteBank, deletePocket, saveBank, savePocket } from './actions';
import { BankForm } from './bank-form';
import { pocketPaths } from './paths';
import { PocketForm } from './pocket-form';

const t = messages.es;

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** Crear (`pocketId` null) o editar un bolsillo general. */
export async function PocketFormScreen({
  clientId,
  pocketId,
}: {
  clientId: string;
  pocketId: string | null;
}) {
  const text = t.pockets.form;
  const paths = pocketPaths(clientId);
  const title = pocketId ? text.editTitle : text.newTitle;
  const rows = await loadCaseRows(clientId);
  if (!rows) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(pocketId ? paths.item(pocketId) : paths.add)}
      </Screen>
    );
  }
  const pocket = pocketId
    ? rows.pockets.find((row) => row.id === pocketId && row.kind === 'general')
    : null;
  if (pocketId && !pocket) notFound();
  const locale = COUNTRY_LOCALES[rows.client.country_code]?.locale ?? 'es';
  const currencies = [rows.client.base_currency, ...rows.fxRates.map((rate) => rate.currency)];

  return (
    <Screen>
      <BackLink href={paths.list} label={t.pockets.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <PocketForm
        text={text}
        initial={{
          name: pocket?.name ?? '',
          purpose: pocket?.purpose ?? '',
          whenUsed: pocket?.when_used ?? '',
          bank: pocket?.bank_id ?? '',
          currency: pocket?.currency ?? rows.client.base_currency,
          balance: amountToText(pocket?.initial_balance ?? null, locale),
        }}
        currencies={currencies}
        banks={rows.banks.map((bank) => ({ id: bank.id, name: bank.name }))}
        action={savePocket.bind(null, clientId, pocketId)}
        deleteAction={pocketId ? deletePocket.bind(null, clientId, pocketId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}

/** Bancos del cliente con cuántos bolsillos tiene cada uno frente a su límite (RN-073). */
export async function BanksScreen({ clientId }: { clientId: string }) {
  const text = t.banks;
  const paths = pocketPaths(clientId);
  const rows = await loadCaseRows(clientId);
  const header = (
    <>
      <BackLink href={paths.list} label={text.back} />
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
        {loadError(paths.banks)}
      </Screen>
    );
  }
  const counts = new Map<string, number>();
  for (const pocket of rows.pockets) {
    if (pocket.bank_id) counts.set(pocket.bank_id, (counts.get(pocket.bank_id) ?? 0) + 1);
  }

  return (
    <Screen>
      {header}
      {rows.banks.length === 0 ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {rows.banks.map((bank) => {
            const count = counts.get(bank.id) ?? 0;
            const over = bank.max_pockets !== null && count > bank.max_pockets;
            return (
              <li key={bank.id}>
                <Link
                  href={paths.bank(bank.id)}
                  className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                >
                  <span className="font-medium wrap-anywhere">{bank.name}</span>
                  <span className="text-sm text-text-muted">
                    {[
                      bank.max_pockets === null
                        ? text.count.replace('{count}', String(count))
                        : text.countWithLimit
                            .replace('{count}', String(count))
                            .replace('{max}', String(bank.max_pockets)),
                      bank.is_remunerated ? text.remunerated : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {over ? (
                    <span className="flex flex-col gap-1 text-sm">
                      <StatusLabel status="warning" label={t.status.warning} />
                      {text.overLimit}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <ScreenActions>
        <Link href={paths.addBank} className={`w-full ${primaryButton} ${linkButton}`}>
          {text.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}

/** Crear (`bankId` null) o editar un banco. */
export async function BankFormScreen({
  clientId,
  bankId,
}: {
  clientId: string;
  bankId: string | null;
}) {
  const text = t.banks.form;
  const paths = pocketPaths(clientId);
  const title = bankId ? text.editTitle : text.newTitle;
  const rows = bankId ? await loadCaseRows(clientId) : null;
  if (bankId && !rows) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(paths.bank(bankId))}
      </Screen>
    );
  }
  const bank = bankId ? rows?.banks.find((row) => row.id === bankId) : null;
  if (bankId && !bank) notFound();

  return (
    <Screen>
      <BackLink href={paths.banks} label={t.banks.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <BankForm
        text={text}
        initial={{
          name: bank?.name ?? '',
          maxPockets: bank?.max_pockets === null || !bank ? '' : String(bank.max_pockets),
          isRemunerated: bank?.is_remunerated ?? false,
          note: bank?.note ?? '',
        }}
        action={saveBank.bind(null, clientId, bankId)}
        deleteAction={bankId ? deleteBank.bind(null, clientId, bankId) : null}
        cancelHref={paths.banks}
      />
    </Screen>
  );
}
