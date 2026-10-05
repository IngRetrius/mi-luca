import 'server-only';

import { COUNTRY_LOCALES, formatDate, messages } from '@miluca/i18n';
import { lightTheme } from '@miluca/ui';

import { getClientDetail } from '@/features/clients';
import { withAddress } from '@/lib/address';

import { formatFigure, PLAN_FIGURES } from './plan-figures';
import { listDeliveries, loadDelivery } from './queries';

const t = messages.es;

/** Nombre del archivo: el que se ve al descargar y uno solo con ASCII para navegadores viejos. */
function contentDisposition(label: string): string {
  const name = `${t.plan.pdf.fileName.replace('{label}', label)}.pdf`;
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w .-]/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * El PDF de un plan entregado (P-A14, P-C05): la carta y las notas con las cifras del día de la
 * entrega, en el trato del cliente, y las cifras del plan. Se arma al pedirlo con lo que quedó fijo
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

  const locale = COUNTRY_LOCALES[client.countryCode]?.locale ?? 'es';
  const view = withAddress(t.documents.view, client.formOfAddress);
  const date = (value: string) => formatDate(value, locale, 'UTC');
  const figures = delivery.keyFigures;
  // La librería de PDF se carga solo al pedir un PDF, no en cada pantalla que usa este módulo.
  const { renderLetterPdf } = await import('@miluca/exporters/pdf');
  const pdf = await renderLetterPdf({
    title: view.letterTitle,
    clientName: client.displayName,
    planLabel: delivery.label,
    meta: t.plan.deliveredOn
      .replace('{date}', date(delivery.deliveredAt))
      .replace('{cutoff}', date(delivery.cutoffDate)),
    letter: delivery.documents.letter,
    notesTitle: view.notesDeliveredTitle,
    notes: delivery.documents.notes,
    figuresTitle: t.plan.figuresTitle,
    figures: PLAN_FIGURES.filter(
      (figure) => figures[figure] !== null && figures[figure] !== undefined,
    ).map((figure) => ({
      label: t.keyFigures[figure],
      value: formatFigure(figure, figures[figure], locale, delivery.baseCurrency),
    })),
    footer: t.plan.currencyNote.replace('{currency}', delivery.baseCurrency),
    pageLabel: t.plan.pdf.pageLabel,
    scope: t.plan.scope,
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
      'Content-Disposition': contentDisposition(delivery.label),
      // Datos personales: ni cachés compartidas ni copia en el navegador.
      'Cache-Control': 'private, no-store',
    },
  });
}
