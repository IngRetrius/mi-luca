import 'server-only';

import { formatDate, type Messages } from '@miluca/i18n';
import { lightTheme } from '@miluca/ui';

import { getClientDetail } from '@/features/clients';
import { withAddress } from '@/lib/address';
import { createClient } from '@/lib/supabase/server';
import { getCaseMessages, getLanguage, getLocale } from '@/server/i18n';

import { planPdfTables } from './pdf-tables';
import { formatFigure, planFigures } from './plan-figures';
import { listDeliveries, loadDelivery } from './queries';

/** La sección de la carta que va arriba del PDF, como en Mi plan (ADR 0028). */
const SUMMARY_SECTION = 'executive_summary';

/**
 * El nombre con que firma el asesor que entregó el plan (su marca, si la tiene). El cliente lo lee
 * mientras su asesor tenga acceso (RLS); si no, el PDF sale sin firma.
 */
async function advisorName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('advisors')
    .select('display_name, brand_name')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.brand_name || data?.display_name || null;
}

/** Nombre del archivo: el que se ve al descargar y uno solo con ASCII para navegadores viejos. */
function contentDisposition(t: Messages, label: string): string {
  const name = `${t.plan.pdf.fileName.replace('{label}', label)}.pdf`;
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w .-]/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * El PDF de un plan entregado (P-A14, P-C05): el resumen de la carta, cómo va el plan, los bolsillos,
 * las deudas y las metas (ADR 0028); después el resto de la carta y las notas con las cifras del día
 * de la entrega, en el trato del cliente, y las cifras del plan. Se arma al pedirlo con lo que quedó fijo
 * en la entrega, así que siempre es el mismo contenido (ADR 0020). `deliveryId` null es el más
 * reciente. 404 si no existe o no hay acceso (RLS).
 */
export async function deliveryPdfResponse(
  clientId: string,
  deliveryId: string | null,
): Promise<Response> {
  const [client, deliveries] = await Promise.all([
    getClientDetail(clientId),
    deliveryId ? Promise.resolve(null) : listDeliveries(clientId),
  ]);
  const id = deliveryId ?? deliveries?.[0]?.id ?? null;
  const delivery = id ? await loadDelivery(clientId, id) : null;
  if (!client || client === 'not-found' || !delivery) {
    return new Response(null, { status: 404 });
  }

  // El PDF es del cliente: su vocabulario y su trato, aunque lo descargue el asesor.
  const [t, language, locale, advisor] = await Promise.all([
    getCaseMessages({ address: client.formOfAddress, country: client.countryCode }),
    getLanguage(),
    getLocale(client.countryCode),
    advisorName(delivery.deliveredBy),
  ]);
  const view = withAddress(t.documents.view, client.formOfAddress);
  const summary = delivery.documents.letter.find((section) => section.key === SUMMARY_SECTION);
  const date = (value: string) => formatDate(value, locale, 'UTC');
  const figures = delivery.keyFigures;
  // La librería de PDF se carga solo al pedir un PDF, no en cada pantalla que usa este módulo.
  const { renderLetterPdf } = await import('@miluca/exporters/pdf');
  const pdf = await renderLetterPdf({
    title: withAddress(t.myPlan, client.formOfAddress).title,
    clientName: client.displayName,
    planLabel: delivery.label,
    meta: t.plan.deliveredOn
      .replace('{date}', date(delivery.deliveredOn))
      .replace('{cutoff}', date(delivery.cutoffDate)),
    advisor: advisor ? t.plan.pdf.preparedBy.replace('{name}', advisor) : null,
    summary: summary ? { title: null, text: summary.text } : null,
    tables: planPdfTables(delivery, t, locale),
    letter: delivery.documents.letter.filter((section) => section.key !== SUMMARY_SECTION),
    letterTitle: view.letterTitle,
    notesTitle: view.notesDeliveredTitle,
    notes: delivery.documents.notes,
    figuresTitle: t.plan.figuresTitle,
    figures: planFigures(delivery.stage)
      .filter((figure) => figures[figure] !== null && figures[figure] !== undefined)
      .map((figure) => ({
        label: t.keyFigures[figure],
        value: formatFigure(
          figure,
          figures[figure],
          locale,
          delivery.baseCurrency,
          t.keyFigureMonths,
        ),
      })),
    footer: t.plan.currencyNote.replace('{currency}', delivery.baseCurrency),
    pageLabel: t.plan.pdf.pageLabel,
    scope: t.plan.scope,
    language,
    colors: {
      text: lightTheme.text,
      textMuted: lightTheme.textMuted,
      border: lightTheme.border,
      surface: lightTheme.surface,
    },
  });
  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition(t, delivery.label),
      // Datos personales: ni cachés compartidas ni copia en el navegador.
      'Cache-Control': 'private, no-store',
    },
  });
}
