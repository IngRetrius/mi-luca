import 'server-only';

import { createClient } from '@/lib/supabase/server';

/** Monedas que se pueden usar en un importe: la base y las que tienen tasa del cliente (RN-017). */
export async function allowedCurrencies(clientId: string): Promise<readonly string[] | null> {
  const supabase = await createClient();
  const [client, rates] = await Promise.all([
    supabase.from('clients').select('base_currency').eq('id', clientId).maybeSingle(),
    supabase.from('client_fx_rates').select('currency').eq('client_id', clientId).order('currency'),
  ]);
  if (client.error || rates.error || !client.data) return null;
  return [client.data.base_currency, ...rates.data.map((rate) => rate.currency)];
}
