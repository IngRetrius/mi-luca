import 'server-only';

import { parseEcbCsv, parseTrm, type OfficialSources } from './official-rates';

/** TRM de la Superfinanciera en datos.gov.co [F81]: las últimas, de la más nueva a la más vieja. */
const TRM_URL =
  'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=10';

/** Tasas de referencia del BCE [F82]: la última de cada moneda, en unidades por euro. */
const ECB_URL =
  'https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&detail=dataonly&format=csvdata';

/**
 * Cada fuente se consulta pocas veces al día (la caché de datos de Next.js la comparte entre
 * peticiones): la TRM cambia una vez por día hábil y el BCE publica una vez al día.
 */
const REVALIDATE_SECONDS = 6 * 60 * 60;

/** Si una fuente tarda más, el formulario sigue sin su sugerencia. */
const TIMEOUT_MS = 5_000;

async function download(url: string, accept: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: { accept },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? response : null;
  } catch {
    return null;
  }
}

async function loadTrm(): Promise<OfficialSources['trm']> {
  const response = await download(TRM_URL, 'application/json');
  try {
    return response ? parseTrm(await response.json()) : [];
  } catch {
    return [];
  }
}

async function loadEcb(): Promise<OfficialSources['ecb']> {
  const response = await download(ECB_URL, 'text/csv');
  try {
    return response ? parseEcbCsv(await response.text()) : [];
  } catch {
    return [];
  }
}

/**
 * Lo publicado hoy por la Superfinanciera y el BCE (ADR 0032). Nunca falla: una fuente que no
 * responde queda vacía y esa sugerencia no aparece. La consulta no lleva datos del cliente.
 */
export async function loadOfficialSources(): Promise<OfficialSources> {
  const [trm, ecb] = await Promise.all([loadTrm(), loadEcb()]);
  return { trm, ecb };
}
