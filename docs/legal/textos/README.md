# Textos legales de P-C02

Avisos que el cliente acepta al entrar por la invitación. Son cortos a propósito: el servicio se presta de manera informal (decisión A7b). Los redactó el agente a partir de la norma registrada en `docs/fuentes.md` (F28, F29, F23, F41) y los aprobó el responsable del tratamiento. **No los revisó un abogado.** Versión 1.0 publicada con la migración `legal_texts_1_0`; los avisos de tratamiento de datos pasaron a 1.1 con `legal_texts_1_1` para nombrar a Anthropic (ADR 0012).

| Archivo | Tipo | País | Qué cubre |
|---|---|---|---|
| `tratamiento-datos-co.md` | `tratamiento_datos` | CO | Aviso de privacidad: responsable, para qué y qué datos, dónde se guardan, cómo consultar, corregir o borrar, y contacto |
| `datos-sensibles-co.md` | `datos_sensibles` | CO | Autorización opcional para datos de salud, que se retira desde la app |
| `tratamiento-datos-es.md` | `tratamiento_datos` | ES | Lo mismo para España, con las cláusulas contractuales tipo de la transferencia, la conservación y la AEPD |
| `datos-sensibles-es.md` | `datos_sensibles` | ES | Consentimiento opcional para datos de salud, que se retira desde la app |

Los textos están en primera persona ("autorizo", "puedo") para que sirvan igual a clientes con tú y con usted. Las líneas que empiezan por "- " se muestran como lista en P-C02.

## Cómo publicar una versión nueva

1. Cambiar el texto y subir la `version:` del archivo.
2. Poner en `estado:` la palabra `aprobado` con la fecha, cuando el responsable lo apruebe.
3. Generar la migración y subirla. El script salta las versiones que ya están en una migración:

```sh
python3 tools/legal-texts/build_migration.py           # comprueba; se niega si falta algo
python3 tools/legal-texts/build_migration.py --write   # escribe la migración
pnpm supabase db push
```

Un texto publicado no se cambia ni se borra cuando ya tiene consentimientos: una corrección es una versión nueva (1.1, 2.0) en otro archivo o cambiando la versión del mismo, y se vuelve a generar la migración solo con lo nuevo.
