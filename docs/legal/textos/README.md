# Textos legales de P-C02

Borradores de los textos que el cliente acepta al entrar por la invitación. Los redacta el agente a partir de la norma registrada en `docs/fuentes.md` (F28, F29, F21, F23, F41) y los aprueba el responsable del tratamiento (decisión A7). **No los revisó un abogado.**

| Archivo | Tipo | País | Qué cubre |
|---|---|---|---|
| `tratamiento-datos-co.md` | `tratamiento_datos` | CO | Autorización de la Ley 1581 de 2012: responsable, finalidades, datos, carácter facultativo de los sensibles, alojamiento en Estados Unidos, conservación, derechos y plazos (arts. 8, 12, 14, 15 y 26) |
| `datos-sensibles-co.md` | `datos_sensibles` | CO | Autorización explícita y facultativa para datos de salud (Ley 1581, arts. 5 y 6; Decreto 1377, art. 6) |
| `tratamiento-datos-es.md` | `tratamiento_datos` | ES | Información del artículo 13 del RGPD, con la ejecución del servicio como base jurídica (art. 6.1.b) y las cláusulas contractuales tipo como garantía de la transferencia |
| `datos-sensibles-es.md` | `datos_sensibles` | ES | Consentimiento explícito para datos de salud (RGPD, art. 9.2.a), que se retira desde la app (art. 7.3) |

Los textos están en primera persona ("autorizo", "puedo") para que sirvan igual a clientes con tú y con usted. Las líneas que empiezan por "- " se muestran como lista en P-C02.

## Qué falta para publicarlos

1. Completar lo marcado `[[POR DEFINIR]]` (preguntas C17 a C19 de `07-preguntas-abiertas.md`).
2. Leerlos y, si estás de acuerdo, cambiar en cada archivo `estado:` por `aprobado` con la fecha.
3. Generar la migración y subirla:

```sh
python3 tools/legal-texts/build_migration.py           # comprueba; se niega si falta algo
python3 tools/legal-texts/build_migration.py --write   # escribe la migración
pnpm supabase db push
```

Un texto publicado no se cambia ni se borra cuando ya tiene consentimientos: una corrección es una versión nueva (1.1, 2.0) en otro archivo o cambiando la versión del mismo, y se vuelve a generar la migración solo con lo nuevo.
