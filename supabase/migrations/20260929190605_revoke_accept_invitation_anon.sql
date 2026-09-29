-- accept_invitation no es para visitantes sin sesión. Supabase da EXECUTE a `anon` directamente en
-- cada función nueva del esquema public, así que revocarlo a `public` en invitation_consent no
-- bastó (lo marcó el asesor de seguridad el 29/09/2026). La función ya rechazaba a quien no tiene
-- sesión; esto cierra también el permiso.
revoke execute on function public.accept_invitation(text, uuid[], text) from anon;
