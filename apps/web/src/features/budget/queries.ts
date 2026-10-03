import 'server-only';

import { createClient } from '@/lib/supabase/server';

/** Lo que la lista de gastos típicos necesita del caso: el país y los conceptos ya registrados. */
export interface CatalogContext {
  readonly countryCode: string;
  readonly baseCurrency: string;
  readonly concepts: readonly string[];
}

/** País y moneda base del cliente y conceptos de su presupuesto. Null si falla. */
export async function loadCatalogContext(clientId: string): Promise<CatalogContext | null> {
  const supabase = await createClient();
  const [client, items] = await Promise.all([
    supabase.from('clients').select('country_code, base_currency').eq('id', clientId).maybeSingle(),
    supabase.from('budget_items').select('concept').eq('client_id', clientId),
  ]);
  if (client.error || !client.data || items.error) return null;
  return {
    countryCode: client.data.country_code,
    baseCurrency: client.data.base_currency,
    concepts: items.data.map((row) => row.concept),
  };
}
