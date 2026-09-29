'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { requireAdvisor } from '@/server/viewer';

import {
  parseNewClient,
  type NewClientField,
  type NewClientFieldError,
  type NewClientValues,
} from './validation';

export type NewClientFormError = 'notAllowed' | 'unavailable';

export interface NewClientState {
  readonly values: NewClientValues;
  readonly errors: Readonly<Partial<Record<NewClientField, NewClientFieldError>>>;
  readonly formError: NewClientFormError | null;
}

/** P-A02: crea el perfil con create_client y abre su ficha. Solo para asesores. */
export async function createClientProfile(
  _previous: NewClientState | null,
  formData: FormData,
): Promise<NewClientState> {
  // Una acción de servidor es un punto de entrada público: se revisa el rol aquí mismo.
  await requireAdvisor('/clientes/nuevo');

  const parsed = parseNewClient(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_client', {
    p_display_name: parsed.values.displayName,
    p_country_code: parsed.values.countryCode,
    p_form_of_address: parsed.values.formOfAddress,
  });
  if (error) {
    // 22023: país que no existe o está deshabilitado; 42501: la cuenta no es de asesor.
    if (error.code === '22023') {
      return { values: parsed.values, errors: { country: 'missingCountry' }, formError: null };
    }
    const formError = error.code === '42501' ? 'notAllowed' : 'unavailable';
    return { values: parsed.values, errors: {}, formError };
  }
  redirect(`/clientes/${data}`);
}
