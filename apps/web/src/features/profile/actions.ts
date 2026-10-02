'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { loadProfile } from './queries';
import { parseProfile, type ProfileErrors, type ProfileValues } from './validation';

export interface ProfileState {
  readonly values: ProfileValues;
  readonly errors: ProfileErrors;
  readonly formError: 'notAllowed' | 'unavailable' | null;
}

/**
 * P-A04 bloque A y P-A05: guarda el perfil y el criterio del caso, y el antes y después (la fecha
 * de corte y el modo cambian las cifras). Pantalla del asesor: el tipo de cliente y los supuestos
 * son criterio profesional (matriz de permisos).
 */
export async function saveProfile(
  clientId: string,
  _previous: ProfileState | null,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await requireCaseEditor(clientId, `/clientes/${clientId}/perfil`);
  const data = await loadProfile(clientId);
  const parsed = parseProfile(formData, {
    today: data?.today ?? '',
    pensionAvailable: data?.pensionAvailable ?? false,
    availableThresholds: data?.thresholds.map((threshold) => threshold.key) ?? [],
  });
  if (viewer.role !== 'advisor')
    return { values: parsed.values, errors: {}, formError: 'notAllowed' };
  if (!data) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };

  const supabase = await createClient();
  const { value: error } = await withImpact(
    clientId,
    async () => {
      const client = await supabase.from('clients').update(parsed.record.client).eq('id', clientId);
      if (client.error) return client.error;
      // Sin upsert: la API no puede escribir `client_id` en una actualización (privilegios por columna).
      const updated = await supabase
        .from('case_settings')
        .update(parsed.record.settings)
        .eq('client_id', clientId)
        .select('client_id');
      if (updated.error || updated.data.length > 0) return updated.error;
      const { error } = await supabase
        .from('case_settings')
        .insert({ ...parsed.record.settings, client_id: clientId });
      return error;
    },
    (outcome) => outcome === null,
  );
  if (error) {
    const formError = error.code === '42501' ? 'notAllowed' : 'unavailable';
    return { values: parsed.values, errors: {}, formError };
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}`);
}
