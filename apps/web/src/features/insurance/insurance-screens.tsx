import Link from 'next/link';
import { notFound } from 'next/navigation';

import { insuranceStatusSchema } from '@miluca/domain';
import { formatMoney, type Messages } from '@miluca/i18n';

import { BackLink, LoadError, ModuleLink } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { loadComputedCase, type ComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { deleteInsurance, saveInsurance, saveLifeSettings } from './actions';
import { InsuranceForm } from './insurance-form';
import { LifeSettingsForm } from './life-settings-form';
import { insurancePaths } from './paths';
import { INSURANCE_TYPES, isInsuranceType, type InsuranceType } from './validation';

/** Los del catálogo de la plantilla (`Seguros!B6:B13`); "otro" son los que se agregan. */
const CATALOG = INSURANCE_TYPES.filter((type) => type !== 'otro');

function localText(t: Messages, viewer: CaseEditor) {
  const text = t.insurance;
  if (viewer.role === 'advisor') return { title: text.title, intro: text.intro, back: text.back };
  return withAddress(text.client, viewer.formOfAddress);
}

function loadError(t: Messages, retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

async function money(computed: ComputedCase) {
  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  return (amount: number, currency = client.base_currency) => formatMoney(amount, currency, locale);
}

/**
 * Seguros (P-A10 y Mis datos): el catálogo de la plantilla con lo que tiene el cliente, las primas
 * nuevas que entran al presupuesto (las en cotización aparte, H-24) y la suma asegurada
 * orientativa de vida (RN-103). Ninguna aseguradora (RN-117).
 */
export async function InsuranceScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const t = await getMessages();
  const text = t.insurance;
  const paths = insurancePaths(viewer.role, clientId);
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
  const format = await money(computed);
  const { insurances, settings } = computed.rows;
  const { insurance, lifeInsurance } = computed.result;
  const byType = new Map(insurances.map((row) => [row.insurance_type, row]));
  const others = insurances.filter((row) => row.insurance_type === 'otro');
  const unanswered =
    CATALOG.some((type) => !byType.get(type)?.status) || others.some((row) => !row.status);
  const describe = (row: (typeof insurances)[number]) => {
    const status = insuranceStatusSchema.safeParse(row.status);
    return [
      status.success ? text.statuses[status.data] : text.unanswered,
      row.annual_premium_quoted !== null && row.status !== 'si'
        ? text.premium.replace('{amount}', format(row.annual_premium_quoted, row.currency))
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };
  const rowLink = (href: string, title: string, summary: string, key: string) => (
    <li key={key}>
      <Link
        href={href}
        className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
      >
        <span className="font-medium wrap-anywhere">{title}</span>
        <span className="text-sm text-text-muted">{summary}</span>
      </Link>
    </li>
  );
  const locale = await getLocale(computed.rows.client.country_code);

  return (
    <Screen>
      {header}
      <FigureList
        figures={[
          { label: text.newPremiums, value: format(insurance.newPremiumsAnnual) },
          { label: text.newPremiumsMonthly, value: format(insurance.newPremiumsMonthly) },
          { label: text.quoting, value: format(insurance.quotingPremiumsAnnual) },
        ]}
      />
      {insurance.quotingPremiumsAnnual > 0 ? (
        <p className="text-sm text-text-muted">{text.quotingNote}</p>
      ) : null}
      {unanswered ? <p className="text-sm">{text.pendingNote}</p> : null}
      {insurance.newPremiumsAnnual > 0 && !settings?.insurance_pocket_id ? (
        <p className="text-sm">{text.noPocket}</p>
      ) : null}

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {CATALOG.map((type) => {
          const row = byType.get(type);
          return row
            ? rowLink(paths.item(row.id), text.types[type], describe(row), type)
            : rowLink(
                paths.add(type),
                text.types[type],
                `${text.unanswered} · ${text.answer}`,
                type,
              );
        })}
        {others.map((row) =>
          rowLink(paths.item(row.id), row.custom_name ?? text.types.otro, describe(row), row.id),
        )}
      </ul>
      <Link href={paths.add()} className={`w-full ${secondaryButton} ${linkButton}`}>
        {text.add}
      </Link>

      <section aria-labelledby="life-title" className="flex flex-col gap-2">
        <h2 id="life-title" className="font-semibold">
          {text.life.title}
        </h2>
        <FigureList
          figures={[
            { label: text.life.debts, value: format(lifeInsurance.debts) },
            { label: text.life.annualToCover, value: format(lifeInsurance.annualToCover) },
            {
              label: text.life.supportYears,
              value: text.life.years.replace(
                '{years}',
                amountToText(lifeInsurance.supportYears, locale, 1),
              ),
            },
            { label: text.life.liquid, value: format(lifeInsurance.liquidAndInvestments) },
            { label: text.life.sumInsured, value: format(lifeInsurance.sumInsured) },
          ]}
        />
        <p className="text-sm text-text-muted">{text.life.note}</p>
      </section>

      {viewer.role === 'advisor' ? (
        <ul className="rounded-xl border border-border">
          <li>
            <ModuleLink
              href={paths.settings}
              title={text.settingsLink}
              summary={text.settingsSummary}
            />
          </li>
        </ul>
      ) : null}
    </Screen>
  );
}

/** Crear (`insuranceId` null, con el tipo del catálogo si viene) o editar un seguro. */
export async function InsuranceFormScreen({
  viewer,
  clientId,
  insuranceId,
  type = null,
}: {
  viewer: CaseEditor;
  clientId: string;
  insuranceId: string | null;
  type?: string | null;
}) {
  const t = await getMessages();
  const text = t.insurance;
  const paths = insurancePaths(viewer.role, clientId);
  const local = localText(t, viewer);
  const title = insuranceId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(t, insuranceId ? paths.item(insuranceId) : paths.add())}
      </Screen>
    );
  }
  const row = insuranceId
    ? computed.rows.insurances.find((entry) => entry.id === insuranceId)
    : null;
  if (insuranceId && !row) notFound();
  const { client, fxRates } = computed.rows;
  const locale = await getLocale(client.country_code);
  const chosen: InsuranceType = isInsuranceType(row?.insurance_type)
    ? row.insurance_type
    : isInsuranceType(type)
      ? type
      : 'otro';
  // Un seguro del catálogo ya registrado se edita, no se repite.
  const existing = row
    ? null
    : computed.rows.insurances.find(
        (entry) => chosen !== 'otro' && entry.insurance_type === chosen,
      );
  if (existing) notFound();
  const status = insuranceStatusSchema.safeParse(row?.status);

  return (
    <Screen>
      <BackLink href={paths.list} label={local.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <InsuranceForm
        text={text.form}
        statuses={text.statuses}
        typeLabel={chosen === 'otro' ? null : text.types[chosen]}
        covers={text.covers[chosen]}
        initial={{
          insuranceType: chosen,
          customName: row?.custom_name ?? '',
          status: status.success ? status.data : '',
          premium: amountToText(row?.annual_premium_quoted ?? null, locale),
          currency: row?.currency ?? client.base_currency,
          beneficiaries: row?.beneficiaries_note ?? '',
          note: row?.note ?? '',
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        action={saveInsurance.bind(null, clientId, insuranceId)}
        deleteAction={insuranceId ? deleteInsurance.bind(null, clientId, insuranceId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}

/** Supuestos de seguros: solo el asesor (la página lo exige). */
export async function LifeSettingsScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.insurance;
  const paths = insurancePaths('advisor', clientId);
  const form = text.settingsForm;
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.list} label={text.title} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{form.title}</h1>
        <p className="text-text-muted">{form.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        {loadError(t, paths.settings)}
      </Screen>
    );
  }
  const { client, settings, pockets } = computed.rows;
  const locale = await getLocale(client.country_code);

  return (
    <Screen>
      {header}
      <LifeSettingsForm
        text={form}
        baseCurrency={client.base_currency}
        initial={{
          supportYears: amountToText(settings?.life_support_years ?? null, locale, 1),
          annualToCover: amountToText(settings?.life_annual_to_cover ?? null, locale),
          pocketId: settings?.insurance_pocket_id ?? '',
        }}
        pockets={pockets
          .filter((pocket) => pocket.kind === 'general')
          .map((pocket) => ({ id: pocket.id, name: pocket.name }))}
        action={saveLifeSettings.bind(null, clientId)}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
