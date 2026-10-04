import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  dropReactionSchema,
  investingExperienceSchema,
  investmentBucketSchema,
  moneyHorizonSchema,
} from '@miluca/domain';
import type { RiskCapacityInput } from '@miluca/engine';
import { COUNTRY_LOCALES, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError, ModuleLink } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { loadComputedCase, type ComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText, percentToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';

import {
  deleteInvestment,
  saveInvestment,
  saveInvestmentSettings,
  saveRiskProfile,
} from './actions';
import { InvestmentForm } from './investment-form';
import { investmentPaths } from './paths';
import { RiskProfileForm, type RiskProfileFormText } from './risk-profile-form';
import { InvestmentSettingsForm } from './settings-form';
import type { CapacityChoice } from './validation';

const t = messages.es;
const text = t.investment;

/**
 * Condiciones de capacidad que se muestran. La brecha pensional de la plantilla no aplica: la
 * pensión no se analiza en la plataforma (ADR 0016) y el motor la deja siempre en "No".
 */
const CONDITIONS: readonly Exclude<keyof RiskCapacityInput, 'pensionGap'>[] = [
  'variableIncome',
  'dependentsWithoutLifeInsurance',
  'emergencyFundIncomplete',
  'nearRetirementWithoutPension',
];

/** Textos según quién mira: el asesor habla del cliente; el cliente, en su trato. */
function localText(viewer: CaseEditor) {
  if (viewer.role === 'advisor') {
    return { title: text.title, intro: text.intro, back: text.back, empty: text.current.empty };
  }
  return withAddress(text.client, viewer.formOfAddress);
}

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

function formatters(computed: ComputedCase) {
  const { client } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  return {
    locale,
    money: (amount: number, currency = client.base_currency) =>
      formatMoney(amount, currency, locale),
    percent: (ratio: number) => formatPercent(ratio, locale, 1),
  };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Inversión (P-A10 y Mis datos): inversiones actuales, perfil de riesgo, % en crecimiento,
 * distribución y proyección ilustrativa de 10 años. Ningún producto ni entidad (RN-117).
 */
export async function InvestmentScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const paths = investmentPaths(viewer.role, clientId);
  const local = localText(viewer);
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
        {loadError(paths.main)}
      </Screen>
    );
  }
  const { money, percent } = formatters(computed);
  const { investment, summary } = computed.result;
  const { profile, allocation, plan, current } = investment;
  const level = (value: keyof typeof text.levels | null) =>
    value === null ? text.profile.unanswered : text.levels[value];
  const split = (row: { readonly growth: number; readonly stability: number }) =>
    text.plan.split
      .replace('{growth}', money(row.growth))
      .replace('{stability}', money(row.stability));
  const answered = profile.willingness !== null;
  const ageMissing = investment.age === null && (profile.final ?? 0) > 0;
  const { parameters } = computed.input;

  return (
    <Screen>
      {header}
      <p className="rounded-xl bg-surface p-4 text-sm">{text.notAdvice}</p>

      <Section id="investment-current" title={text.current.title}>
        {computed.rows.investments.length === 0 ? (
          <p className="text-text-muted">{local.empty}</p>
        ) : (
          <>
            <FigureList
              figures={[
                { label: text.current.total, value: money(current.total) },
                { label: text.current.growth, value: money(current.growth) },
                { label: text.current.stability, value: money(current.stability) },
              ]}
            />
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {computed.rows.investments.map((row) => {
                const bucket = investmentBucketSchema.safeParse(row.bucket);
                return (
                  <li key={row.id}>
                    <Link
                      href={paths.item(row.id)}
                      className={`flex min-h-12 items-start justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium wrap-anywhere">{row.name}</span>
                        <span className="text-sm text-text-muted">
                          {bucket.success ? text.buckets[bucket.data] : text.current.noBucket}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-medium tabular-nums">
                        {money(row.balance, row.currency)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <Link href={paths.add} className={`w-full ${secondaryButton} ${linkButton}`}>
          {text.current.add}
        </Link>
      </Section>

      <Section id="investment-profile" title={text.profile.title}>
        <FigureList
          figures={[
            { label: text.profile.willingness, value: level(profile.willingnessLevel) },
            { label: text.profile.capacity, value: level(profile.capacityLevel) },
            { label: text.profile.final, value: level(profile.finalLevel) },
          ]}
        />
        <div className="flex flex-col gap-1 text-sm">
          <h3 className="font-medium">{text.profile.conditionsTitle}</h3>
          <ul className="flex flex-col gap-1">
            {CONDITIONS.map((condition) => (
              <li key={condition} className="flex flex-wrap justify-between gap-x-3">
                <span>{text.profile.conditions[condition]}</span>
                <span className="font-medium">
                  {profile.conditions[condition] ? text.profile.yes : text.profile.no}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-text-muted">
            {text.profile.conditionsMet.replace('{count}', String(profile.conditionsMet))}
          </p>
          {summary.hasExpensiveDebt ? <p>{text.profile.expensiveDebt}</p> : null}
        </div>
        <Link href={paths.profile} className={`w-full ${secondaryButton} ${linkButton}`}>
          {answered ? text.profile.edit : text.profile.answer}
        </Link>
      </Section>

      <Section id="investment-allocation" title={text.allocation.title}>
        <FigureList
          figures={[
            {
              label: text.allocation.range,
              value: text.allocation.rangeValue
                .replace('{min}', percent(allocation.rangeMin))
                .replace('{max}', percent(allocation.rangeMax)),
            },
            { label: text.allocation.growth, value: percent(allocation.growthShare) },
            { label: text.allocation.stability, value: percent(allocation.stabilityShare) },
          ]}
        />
        {allocation.note ? (
          <p className="text-sm">{text.allocation.notes[allocation.note]}</p>
        ) : null}
        {ageMissing ? <p className="text-sm">{text.allocation.ageMissing}</p> : null}
      </Section>

      <Section id="investment-plan" title={text.plan.title}>
        <p className="text-sm text-text-muted">{text.plan.intro}</p>
        <dl className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
          {(
            [
              [text.plan.monthly, plan.monthly],
              [text.plan.annual, plan.annual],
              [text.plan.lumpSum, plan.lumpSum],
              [text.plan.current, plan.current],
              [text.plan.target, plan.target],
            ] as const
          ).map(([label, row]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 p-4">
              <dt className="font-medium">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{money(row.total)}</dd>
              <dd className="col-span-2 text-text-muted tabular-nums">{split(row)}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-1 p-4">
            <dt className="font-medium">{text.plan.movement}</dt>
            <dd className="tabular-nums">{split(plan.movement)}</dd>
            <dd className="text-text-muted">{text.plan.movementHint}</dd>
          </div>
        </dl>
      </Section>

      <Section id="investment-projection" title={text.projection.title}>
        <p className="text-sm font-medium">{text.illustrative}</p>
        <p className="text-sm text-text-muted">{text.projection.intro}</p>
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
          {investment.projection.map((year) => (
            <li key={year.year} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap justify-between gap-x-3">
                <span className="font-medium">
                  {year.ageAtClose === null
                    ? text.projection.year.replace('{year}', String(year.year))
                    : text.projection.yearAge
                        .replace('{year}', String(year.year))
                        .replace('{age}', String(year.ageAtClose))}
                </span>
                <span className="text-right font-medium tabular-nums">
                  {money(year.endBalance)}
                </span>
              </div>
              <span className="text-text-muted tabular-nums">
                {text.projection.detail
                  .replace('{growth}', percent(year.growthShare))
                  .replace('{contributions}', money(year.contribution + year.receivables))
                  .replace('{returns}', money(year.returnAmount))}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {viewer.role === 'advisor' ? (
        <ul className="rounded-xl border border-border">
          <li>
            <ModuleLink
              href={paths.settings}
              title={text.settingsLink}
              summary={text.settingsSummary
                .replace('{age}', String(parameters.retirementAge))
                .replace('{growth}', percent(parameters.projection.realReturnGrowth))
                .replace('{stability}', percent(parameters.projection.realReturnStability))}
            />
          </li>
        </ul>
      ) : null}
    </Screen>
  );
}

/** Crear (`investmentId` null) o editar una inversión actual. */
export async function InvestmentFormScreen({
  viewer,
  clientId,
  investmentId,
}: {
  viewer: CaseEditor;
  clientId: string;
  investmentId: string | null;
}) {
  const paths = investmentPaths(viewer.role, clientId);
  const local = localText(viewer);
  const title = investmentId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(investmentId ? paths.item(investmentId) : paths.add)}
      </Screen>
    );
  }
  const row = investmentId
    ? computed.rows.investments.find((entry) => entry.id === investmentId)
    : null;
  if (investmentId && !row) notFound();
  const { client, fxRates } = computed.rows;
  const { locale } = formatters(computed);
  const bucket = investmentBucketSchema.safeParse(row?.bucket);

  return (
    <Screen>
      <BackLink href={paths.main} label={local.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <InvestmentForm
        text={text.form}
        buckets={text.buckets}
        bucketHints={text.bucketHints}
        initial={{
          name: row?.name ?? '',
          bucket: bucket.success ? bucket.data : '',
          balance: amountToText(row?.balance ?? null, locale),
          currency: row?.currency ?? client.base_currency,
          note: row?.note ?? '',
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        action={saveInvestment.bind(null, clientId, investmentId)}
        deleteAction={investmentId ? deleteInvestment.bind(null, clientId, investmentId) : null}
        cancelHref={paths.main}
      />
    </Screen>
  );
}

/** Una respuesta guardada; vacía si no hay o no es del catálogo. */
function answer<T extends string>(parsed: { success: true; data: T } | { success: false }): T | '' {
  return parsed.success ? parsed.data : '';
}

const capacityChoice = (value: boolean | null): CapacityChoice =>
  value === null ? '' : value ? 'si' : 'no';

/** Perfil de riesgo: el cliente responde; el asesor además fija su criterio. */
export async function RiskProfileScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const paths = investmentPaths(viewer.role, clientId);
  const form = text.riskForm;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{form.title}</h1>
        {loadError(paths.profile)}
      </Screen>
    );
  }
  const { locale } = formatters(computed);
  const risk = computed.rows.riskProfile;
  const client = viewer.role === 'client' ? withAddress(form.client, viewer.formOfAddress) : null;
  const formText: RiskProfileFormText = {
    ...form,
    dropReaction: client?.dropReaction ?? form.dropReaction,
    experience: client?.experience ?? form.experience,
    horizon: client?.horizon ?? form.horizon,
  };
  // Lo sugerido sin el cambio del asesor: por tipo de cliente y por personas a cargo sin seguro.
  const { profile: caseProfile } = computed.input;
  const suggestedVariable = caseProfile.clientType === 'independiente_variable';
  const suggestedDependents =
    caseProfile.dependents > 0 && computed.result.insurance.lifeStatus !== 'si';
  const yesNo = (value: boolean) => form.suggested.replace('{value}', value ? form.yes : form.no);

  return (
    <Screen>
      <BackLink href={paths.main} label={localText(viewer).title} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{form.title}</h1>
        <p className="text-text-muted">{client?.intro ?? form.intro}</p>
      </div>
      <RiskProfileForm
        text={formText}
        advisor={
          viewer.role === 'advisor'
            ? { variableIncome: yesNo(suggestedVariable), dependents: yesNo(suggestedDependents) }
            : null
        }
        initial={{
          dropReaction: answer(dropReactionSchema.safeParse(risk?.drop_reaction)),
          experience: answer(investingExperienceSchema.safeParse(risk?.experience)),
          horizon: answer(moneyHorizonSchema.safeParse(risk?.horizon)),
          variableIncome: capacityChoice(risk?.variable_income_override ?? null),
          dependents: capacityChoice(risk?.dependents_override ?? null),
          rangePosition:
            risk && risk.range_position !== 0.5 ? percentToText(risk.range_position, locale) : '',
        }}
        action={saveRiskProfile.bind(null, clientId)}
        cancelHref={paths.main}
      />
    </Screen>
  );
}

/** Supuestos de inversión del caso: solo el asesor (la página lo exige). */
export async function InvestmentSettingsScreen({ clientId }: { clientId: string }) {
  const paths = investmentPaths('advisor', clientId);
  const form = text.settingsForm;
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.main} label={text.title} />
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
        {loadError(paths.settings)}
      </Screen>
    );
  }
  const { locale } = formatters(computed);
  const pct = (value: number) => formatPercent(value, locale, 1);
  const { methodology, settings, client } = computed.rows;
  const methodologyAge =
    methodology.retirementAgeBySex[client.sex ?? 'mujer'] ?? methodology.retirementAgeBySex.mujer;
  const hint = (value: number) => form.percentHint.replace('{value}', pct(value));

  return (
    <Screen>
      {header}
      <InvestmentSettingsForm
        text={form}
        hints={{
          retirementAge: form.retirementAgeHint.replace('{value}', String(methodologyAge ?? '')),
          realReturnGrowth: hint(methodology.realReturnGrowth),
          realReturnStability: hint(methodology.realReturnStability),
          glideStep: hint(methodology.growthGlideStep),
          growthFloor: hint(methodology.growthFloor),
        }}
        initial={{
          retirementAge: settings?.retirement_age ? String(settings.retirement_age) : '',
          realReturnGrowth: percentToText(settings?.real_return_growth ?? null, locale),
          realReturnStability: percentToText(settings?.real_return_stability ?? null, locale),
          glideStep: percentToText(settings?.growth_glide_step ?? null, locale),
          growthFloor: percentToText(settings?.growth_floor ?? null, locale),
        }}
        action={saveInvestmentSettings.bind(null, clientId)}
        cancelHref={paths.main}
      />
    </Screen>
  );
}
