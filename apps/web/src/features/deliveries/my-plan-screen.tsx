import Link from 'next/link';

import { COUNTRY_LOCALES, formatDate, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { focusRing } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress, type FormOfAddress } from '@/lib/address';

import { PlanView } from './plan-view';
import { listDeliveries, loadDelivery } from './queries';

const t = messages.es;

/**
 * P-C05 Mi plan: el plan entregado vigente (el más reciente) o la versión elegida, por secciones,
 * con la comparación con hoy. Sin PDF todavía (F7).
 */
export async function MyPlanScreen({
  clientId,
  formOfAddress,
  version,
}: {
  clientId: string;
  formOfAddress: FormOfAddress;
  /** Id de una entrega anterior, desde `?version=`; si no, la más reciente. */
  version: string | null;
}) {
  const text = withAddress(t.myPlan, formOfAddress);
  const [deliveries, computed] = await Promise.all([
    listDeliveries(clientId),
    loadComputedCase(clientId),
  ]);
  const header = (
    <>
      <BackLink href="/" label={text.back} />
      <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
    </>
  );
  if (!deliveries) {
    return (
      <Screen>
        {header}
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref="/mi-plan" />
      </Screen>
    );
  }
  const chosen = deliveries.find((delivery) => delivery.id === version) ?? deliveries[0];
  if (!chosen) {
    return (
      <Screen>
        {header}
        <p className="text-text-muted">{text.none}</p>
      </Screen>
    );
  }
  const delivery = await loadDelivery(clientId, chosen.id);
  const country = computed?.rows.client.country_code;
  const locale = (country && COUNTRY_LOCALES[country]?.locale) ?? 'es';

  return (
    <Screen>
      {header}
      {delivery ? (
        <>
          <p className="-mt-4 font-medium wrap-anywhere">{delivery.label}</p>
          <PlanView
            delivery={delivery}
            today={computed?.figures ?? null}
            locale={locale}
            currency={delivery.baseCurrency}
          />
        </>
      ) : (
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref="/mi-plan" />
      )}
      {deliveries.length > 1 ? (
        <nav aria-labelledby="versions-title" className="flex flex-col gap-2">
          <h2 id="versions-title" className="font-semibold">
            {t.plan.versions}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {deliveries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/mi-plan?version=${entry.id}`}
                  aria-current={entry.id === chosen.id ? 'page' : undefined}
                  className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface aria-[current=page]:bg-surface ${focusRing}`}
                >
                  <span className="font-medium wrap-anywhere">{entry.label}</span>
                  <span className="text-sm text-text-muted">
                    {formatDate(entry.deliveredAt, locale, 'UTC')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </Screen>
  );
}
