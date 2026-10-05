import Link from 'next/link';

import { budgetCatalog, categoryLabel } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen, ScreenActions } from '@/components/screen';
import { linkButton, primaryButton } from '@/components/ui-classes';
import { CaptureAssistant, proposeCapture } from '@/features/assistant';
import { withAddress } from '@/lib/address';
import type { CaseEditor } from '@/server/case-access';
import { getLanguage, getLocale, getMessages } from '@/server/i18n';

import { addCatalogItems } from './actions';
import { comparableName, conceptPresent } from './catalog';
import { CatalogForm, type CatalogCategoryView } from './catalog-form';
import { budgetPaths } from './paths';
import { loadCatalogContext } from './queries';

/**
 * P-A06b (asesor) y su versión en Mis gastos (cliente): los gastos típicos del país del cliente
 * por categoría, para marcar lo que gasta. Lo que ya está en el presupuesto se ve, pero no se repite.
 */
export async function BudgetCatalogScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const t = await getMessages();
  const text = t.budget.catalog;
  const paths = budgetPaths(viewer.role, clientId);
  const intro =
    viewer.role === 'advisor' ? text.intro : withAddress(text.client, viewer.formOfAddress).intro;
  const back = {
    href: paths.list,
    label: viewer.role === 'advisor' ? t.budget.title : t.budget.client.title[viewer.formOfAddress],
  };
  const context = await loadCatalogContext(clientId);

  const heading = (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
      <p className="text-text-muted">{intro}</p>
    </div>
  );

  if (!context) {
    return (
      <Screen>
        <BackLink {...back} />
        {heading}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.catalog}
        />
      </Screen>
    );
  }

  const present = new Set(context.concepts.map(comparableName));
  const language = await getLanguage();
  const catalog = budgetCatalog(context.countryCode, language);
  const categories: CatalogCategoryView[] = catalog.map((category) => ({
    name: categoryLabel(category.name, language),
    concepts: category.concepts.map((item) => ({
      key: item.key,
      name: item.name,
      details: [
        t.budget.frequencies[item.frequency],
        t.budget.expenseTypes[item.expenseType],
        item.pocket ? text.pocket.replace('{pocket}', item.pocket) : null,
        item.essential ? text.essential : null,
      ]
        .filter((part): part is string => part !== null)
        .join(' · '),
      hint: item.hint,
      needsDays: item.frequency === 'por_duracion',
      present: conceptPresent(present, item, context.countryCode),
    })),
  }));
  const pending = categories.some((category) => category.concepts.some((item) => !item.present));

  if (!pending) {
    return (
      <Screen>
        <BackLink {...back} />
        {heading}
        <p className="text-text-muted">
          {categories.length === 0 ? text.noCatalog : text.allPresent}
        </p>
        <ScreenActions>
          <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
            {viewer.role === 'advisor' ? t.budget.add : t.budget.client.add}
          </Link>
        </ScreenActions>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink {...back} />
      {heading}
      <CatalogForm
        categories={categories}
        text={{
          pocketNote: text.pocketNote,
          amount: text.amount,
          days: text.days,
          present: text.present,
          moreTitle: text.moreTitle,
          more: text.more,
          submit: text.submit,
          submitting: text.submitting,
          cancel: text.cancel,
          errors: text.errors,
        }}
        action={addCatalogItems.bind(null, clientId)}
        cancelHref={paths.list}
      >
        {/* El asistente con IA es solo del asesor (ADR 0012): el cliente no lo ve. */}
        {viewer.role === 'advisor' ? (
          <CaptureAssistant
            propose={proposeCapture.bind(null, clientId)}
            text={t.assistant}
            frequencies={t.budget.frequencies}
            locale={await getLocale(context.countryCode)}
            currency={context.baseCurrency}
          />
        ) : null}
      </CatalogForm>
    </Screen>
  );
}
